"""Education extraction: highest detected degree level from a document."""

from .analysis_helpers import DEGREE_NAMES, extract_degree_level


def extract_level(text: str) -> int:
    """Return the highest degree level detected (0 = none)."""
    return extract_degree_level(text)


def level_name(level: int) -> str:
    return DEGREE_NAMES.get(level, DEGREE_NAMES[0])
