"""Health and model status endpoints."""

from fastapi import APIRouter

from ..core.config import get_settings
from ..schemas.common import Envelope
from ..schemas.datasets import DatasetValidateResponse  # noqa: F401 (re-export convenience)
from ..transformer_nlp.model_manager import model_status

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> Envelope:
    settings = get_settings()
    status, message, model_name = model_status()
    return Envelope(
        success=True,
        data={
            "service": settings.app_name,
            "version": settings.app_version,
            "engines": {
                "traditional": "ready",  # TF-IDF needs no downloads
                "transformer": status,
            },
            "transformer_message": message,
            "model_name": model_name,
            "auth_mode": "disabled (development)" if settings.auth_disabled else (
                "clerk+service" if settings.python_api_secret else "clerk"
            ),
            "background_tasks": "celery+redis" if settings.redis_url else "inline (REDIS_URL not configured)",
        },
    )
