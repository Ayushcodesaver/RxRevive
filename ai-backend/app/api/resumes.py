"""Resume text extraction endpoint (PDF, DOCX, TXT) — in-memory only."""

import time

from fastapi import APIRouter, File, HTTPException, UploadFile

from ..core.config import get_settings
from ..schemas.common import Envelope
from ..shared.text_extraction import ExtractionError, extract_text, looks_like_scanned_pdf

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("/extract")
async def extract_resume(resume_file: UploadFile = File(...)) -> Envelope:
    settings = get_settings()
    started = time.perf_counter()
    filename = resume_file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in settings.allowed_extension_list:
        raise HTTPException(status_code=422, detail="Unsupported file type. Upload a PDF, DOCX or TXT file.")
    data = await resume_file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"The file exceeds the {settings.max_upload_mb} MB limit.")
    try:
        text = extract_text(filename, data)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Envelope(
        success=True,
        data={
            "filename": filename,
            "text": text,
            "preview": text[:1500] + ("…" if len(text) > 1500 else ""),
            "chars": len(text),
            "looks_scanned": looks_like_scanned_pdf(data) if extension == "pdf" else False,
        },
        metadata={"processing_time_ms": round((time.perf_counter() - started) * 1000)},
    )
