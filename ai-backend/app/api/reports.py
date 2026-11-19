"""Report generation and download endpoints (ReportLab PDFs)."""

import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..core.security import Identity, verify_identity
from ..schemas.common import Envelope
from ..services.report_service import generate_and_store, resolve_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate")
def generate_report(body: dict, identity: Identity = Depends(verify_identity)) -> Envelope:
    analysis_id = (body.get("analysis_id") or "").strip()
    if not analysis_id:
        raise HTTPException(status_code=422, detail="analysis_id is required.")
    payload = body.get("payload") or {}
    if not isinstance(payload, dict) or not payload:
        raise HTTPException(status_code=422, detail="The analysis payload is required to render a report.")
    try:
        stored = generate_and_store(
            analysis_id,
            body.get("model_key") or "compare",
            body.get("job_title"),
            body.get("company"),
            body.get("resume_filename"),
            payload,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}") from exc
    return Envelope(success=True, data={
        "filename": stored["filename"],
        "size_bytes": stored["bytes"],
        "download_url": f"/api/v1/reports/download/{stored['filename']}",
        "storage": "local reports directory (object storage documented in BUILD_STATUS.md)",
    })


@router.get("/download/{filename}")
def download_report(filename: str, identity: Identity = Depends(verify_identity)):
    try:
        path = resolve_report(filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path, media_type="application/pdf", filename=os.path.basename(path))
