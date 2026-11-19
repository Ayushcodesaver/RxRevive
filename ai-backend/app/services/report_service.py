"""Report service: render PDF bytes, persist locally, resolve stored files."""

import os
import uuid

from ..core.config import get_settings
from ..reports.report_generator import generate_pdf_bytes, report_filename


def generate_and_store(analysis_id: str, model_key: str, job_title: str | None,
                       company: str | None, resume_filename: str | None, payload: dict) -> dict:
    """Generate the PDF and store it in the local reports directory.

    Object storage (R2/S3) is configured via environment variables; when the
    storage integration is active it replaces the local directory (documented
    in BUILD_STATUS.md).
    """
    settings = get_settings()
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", settings.generated_reports_dir))
    os.makedirs(directory, exist_ok=True)

    filename = report_filename(analysis_id)
    path = os.path.join(directory, filename)
    content = generate_pdf_bytes(analysis_id, model_key, job_title, company, resume_filename, payload)
    with open(path, "wb") as handle:
        handle.write(content)
    return {"filename": filename, "path": path, "bytes": len(content), "token": uuid.uuid4().hex[:12]}


def resolve_report(filename: str) -> str:
    """Resolve a report filename inside the reports dir; blocks traversal."""
    settings = get_settings()
    directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", settings.generated_reports_dir))
    safe = os.path.basename(filename)
    path = os.path.abspath(os.path.join(directory, safe))
    if not path.startswith(directory) or not os.path.exists(path):
        raise FileNotFoundError("Report not found.")
    return path
