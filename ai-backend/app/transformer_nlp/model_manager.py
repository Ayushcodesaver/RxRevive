"""Sentence-BERT model manager: lazy singleton, status, device detection.

The model is loaded once per process and cached; errors are memoized so a
failed download does not retry on every request. Status is reported honestly:
the app never pretends the model is available when it is not.
"""

import threading

from ..core.config import get_settings

_MODEL = None
_MODEL_ERROR: str | None = None
_LOCK = threading.Lock()


class ModelUnavailableError(Exception):
    """Raised when the SBERT model cannot be loaded or used."""


def _pick_device(explicit: str) -> str | None:
    if explicit and explicit != "auto":
        return None if explicit == "cpu" else explicit
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else None
    except Exception:
        return None


def get_model():
    """Load the SentenceTransformer once; thread-safe; error memoized."""
    global _MODEL, _MODEL_ERROR
    settings = get_settings()
    if _MODEL is not None:
        return _MODEL
    with _LOCK:
        if _MODEL is not None:
            return _MODEL
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            _MODEL_ERROR = (
                "sentence-transformers is not installed. Install it with: "
                "pip install sentence-transformers torch"
            )
            raise ModelUnavailableError(_MODEL_ERROR) from exc
        try:
            _MODEL = SentenceTransformer(
                settings.sbert_model_name,
                device=_pick_device(settings.sbert_device),
            )
            return _MODEL
        except Exception as exc:
            _MODEL_ERROR = (
                f"Could not load the {settings.sbert_model_name} model. The first run needs "
                f"internet access to download it from Hugging Face (~90 MB). Error: {exc}"
            )
            raise ModelUnavailableError(_MODEL_ERROR) from exc


def reset_model() -> None:
    """Clear the cached model (used by experiments to swap models)."""
    global _MODEL, _MODEL_ERROR
    with _LOCK:
        _MODEL = None
        _MODEL_ERROR = None


def model_status() -> tuple[str, str, str | None]:
    """(status, message, model_name): 'ready' | 'unavailable' | 'not-loaded'."""
    settings = get_settings()
    if _MODEL is not None:
        try:
            device = str(getattr(_MODEL, "device", "cpu"))
        except Exception:
            device = "cpu"
        return "ready", f"{settings.sbert_model_name} loaded on {device}", settings.sbert_model_name
    if _MODEL_ERROR:
        return "unavailable", _MODEL_ERROR, settings.sbert_model_name
    return (
        "not-loaded",
        "The Sentence-BERT model has not been loaded yet. It loads on first use "
        "(first run downloads ~90 MB and needs internet access).",
        settings.sbert_model_name,
    )
