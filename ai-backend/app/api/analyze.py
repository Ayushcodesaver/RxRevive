"""Analysis endpoints: traditional, transformer and compare."""

import time

from fastapi import APIRouter, Depends, HTTPException

from ..core.config import get_settings
from ..core.logging import get_logger
from ..core.security import Identity, verify_identity
from ..schemas.common import Envelope
from ..schemas.datasets import DatasetValidateResponse  # noqa: F401
from ..services.analysis_service import run_analysis
from ..transformer_nlp.model_manager import ModelUnavailableError, model_status

logger = get_logger(__name__)
router = APIRouter(prefix="/analyze", tags=["analyze"])


def _model_meta() -> tuple[str | None, str | None]:
    settings = get_settings()
    _, _, model_name = model_status()
    return model_name, settings.sbert_model_name


@router.post("/traditional")
def analyze_traditional_route(body: dict, identity: Identity = Depends(verify_identity)) -> Envelope:
    started = time.perf_counter()
    try:
        payload = run_analysis(body.get("resume_text") or "", body.get("job_description") or "", "traditional")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    model_name, version = _model_meta()
    return Envelope(success=True, data=payload, metadata={
        "processing_time_ms": round((time.perf_counter() - started) * 1000),
        "model_name": model_name, "model_version": version, "identity_method": identity.method,
    })


@router.post("/transformer")
def analyze_transformer_route(body: dict, identity: Identity = Depends(verify_identity)) -> Envelope:
    started = time.perf_counter()
    try:
        payload = run_analysis(body.get("resume_text") or "", body.get("job_description") or "", "transformer")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    model_name, version = _model_meta()
    return Envelope(success=True, data=payload, metadata={
        "processing_time_ms": round((time.perf_counter() - started) * 1000),
        "model_name": model_name, "model_version": version, "identity_method": identity.method,
    })


@router.post("/compare")
def analyze_compare_route(body: dict, identity: Identity = Depends(verify_identity)) -> Envelope:
    started = time.perf_counter()
    try:
        payload = run_analysis(body.get("resume_text") or "", body.get("job_description") or "", "compare")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    model_name, version = _model_meta()
    return Envelope(success=True, data=payload, metadata={
        "processing_time_ms": round((time.perf_counter() - started) * 1000),
        "model_name": model_name, "model_version": version, "identity_method": identity.method,
    })
