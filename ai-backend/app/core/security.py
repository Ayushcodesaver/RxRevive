"""Request authentication for the FastAPI service.

Three accepted channels, in order:

1. Clerk JWT  - ``Authorization: Bearer <jwt>`` verified against the Clerk
   JWKS endpoint (issuer, optional audience, expiry and signature checked).
2. Service secret - ``X-API-Secret: <secret>`` matching ``PYTHON_API_SECRET``.
   Used by the Next.js server routes AFTER they have authenticated the user
   with Clerk; the verified user id travels in ``X-User-Id``.
3. Anonymous - only when ``AUTH_DISABLED=true`` (local development / test).

A ``user_id`` supplied by the frontend is never trusted on its own: it is only
accepted through channel 1 (extracted from the verified token) or channel 2
(supplied by the Next.js server which verified it with Clerk).
"""

import time
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException, status

from .config import get_settings

_JWKS_CACHE: dict = {"keys": None, "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


@dataclass
class Identity:
    user_id: str | None
    method: str  # "clerk_jwt" | "service_secret" | "anonymous"
    claims: dict


class AuthError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _fetch_jwks(issuer: str) -> dict:
    """Fetch and cache the Clerk JWKS document (per process, TTL 1 hour)."""
    import httpx

    now = time.time()
    if _JWKS_CACHE["keys"] is not None and now - _JWKS_CACHE["fetched_at"] < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE["keys"]
    url = issuer.rstrip("/") + "/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    jwks = response.json()
    _JWKS_CACHE["keys"] = jwks
    _JWKS_CACHE["fetched_at"] = now
    return jwks


def _verify_clerk_jwt(token: str, issuer: str, audience: str) -> dict:
    """Verify signature, issuer, audience and expiry against Clerk's JWKS."""
    try:
        unverified = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise AuthError(f"Malformed authorization header: {exc}") from exc

    kid = unverified.get("kid")
    jwks = _fetch_jwks(issuer)
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if key is None:
        raise AuthError("Signing key not found in the JWKS document.")

    kwargs = {"issuer": issuer.rstrip("/") + "/"}
    if audience:
        kwargs["audience"] = audience
    options = {"require": ["exp", "iss", "sub"]}
    try:
        from jwt import PyJWK

        return jwt.decode(token, PyJWK.from_dict(key).key, algorithms=["RS256"], options=options, **kwargs)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("The session token has expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError(f"Token verification failed: {exc}") from exc


def verify_identity(
    authorization: str | None = Header(default=None),
    x_api_secret: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> Identity:
    settings = get_settings()

    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise AuthError("Authorization header must be 'Bearer <token>'.")
        if not settings.clerk_jwt_issuer_domain:
            raise AuthError(
                "Clerk token received but CLERK_JWT_ISSUER_DOMAIN is not configured on the backend."
            )
        claims = _verify_clerk_jwt(token, settings.clerk_jwt_issuer_domain, settings.clerk_jwt_audience)
        user_id = claims.get("sub")
        return Identity(user_id=user_id, method="clerk_jwt", claims=claims)

    if x_api_secret:
        if not settings.python_api_secret or x_api_secret != settings.python_api_secret:
            raise AuthError("Invalid service secret.")
        return Identity(user_id=x_user_id or None, method="service_secret", claims={})

    if settings.auth_disabled:
        return Identity(user_id=None, method="anonymous", claims={})

    raise AuthError("Authentication required. Send a Clerk bearer token or the service secret.")
