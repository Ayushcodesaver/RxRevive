"""Gemini resume-assist endpoint (AI-drafted descriptions)."""

import time

from fastapi import APIRouter, Depends, HTTPException

from ..core.security import Identity, verify_identity
from ..schemas.assist import AssistRequest, AssistResponse
from ..schemas.common import Envelope
from ..services.assist_service import AssistUnavailableError, draft_suggestions

router = APIRouter(prefix="/assist", tags=["assist"])


@router.post("/suggestions", response_model=Envelope)
def assist_suggestions(body: AssistRequest, identity: Identity = Depends(verify_identity)) -> Envelope:
    started = time.perf_counter()
    try:
        result = draft_suggestions(
            body.resume_text,
            body.job_description,
            body.matched_skills,
            body.missing_skills,
            body.match_score,
            body.similarity_pct,
            body.skill_pct,
        )
    except AssistUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Envelope(
        success=True,
        data=result,
        metadata={
            "processing_time_ms": round((time.perf_counter() - started) * 1000),
            "model_name": result["model"],
            "identity_method": identity.method,
        },
    )
