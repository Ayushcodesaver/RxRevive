"""Experience extraction: stated years of experience from a document."""

from .analysis_helpers import extract_experience_years


def extract_years(text: str) -> int | None:
    """Return the stated years of experience, or None when not stated."""
    return extract_experience_years(text)
