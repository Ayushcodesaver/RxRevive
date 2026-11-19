"""Shared router dependencies and the response envelope helper."""

import time

from fastapi import Depends

from ..core.security import Identity, verify_identity
from ..schemas.common import Envelope, Metadata


def envelope(data, identity: Identity | None = None, started: float | None = None,
             model_name: str | None = None, model_version: str | None = None,
             persisted: bool | None = None) -> Envelope:
    metadata = Metadata(
        processing_time_ms=round((time.perf_counter() - started) * 1000) if started is not None else None,
        model_name=model_name,
        model_version=model_version,
        identity_method=identity.method if identity else None,
        persisted=persisted,
    )
    return Envelope(success=True, data=data, metadata=metadata)


def require_identity() -> Identity:
    return Depends(verify_identity)
