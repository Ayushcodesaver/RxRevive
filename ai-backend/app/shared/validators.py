"""Input validation shared by the API routers."""

import re

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class ValidationError(ValueError):
    """Raised when an input fails validation; routers map it to HTTP 422."""


def valid_email(value: str) -> bool:
    return bool(_EMAIL_RE.match(value or ""))


def require_text(value: str | None, label: str, minimum: int) -> str:
    text = (value or "").strip()
    if len(text) < minimum:
        raise ValidationError(f"{label} is too short; provide at least {minimum} characters.")
    return text


def check_document_pair(resume_text: str, jd_text: str) -> tuple[str, str]:
    resume = require_text(resume_text, "The resume", 80)
    jd = require_text(jd_text, "The job description", 80)
    return resume, jd
