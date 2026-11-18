"""Transformer NLP engine: Sentence-BERT semantic embeddings + cosine similarity.

The model (all-MiniLM-L6-v2) is loaded lazily once and cached for the life
of the process — no reloading per request.
"""

import threading
import time

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from ..shared.analysis_helpers import (
    WEIGHT_SIMILARITY,
    WEIGHT_SKILLS,
    build_narrative,
    education_alignment,
    experience_alignment,
    suitability_label,
)
from ..shared.skill_extractor import skill_category

ENGINE_NAME = "Transformer NLP (Sentence-BERT)"
COSINE_LABEL = "Semantic similarity (SBERT cosine)"

_model = None
_model_error = None
_lock = threading.Lock()


class ModelUnavailableError(Exception):
    """Raised when the SBERT model cannot be loaded or used."""


def get_model():
    """Load SentenceTransformer once; thread-safe; error memoized."""
    global _model, _model_error
    if _model is not None:
        return _model
    with _lock:
        if _model is not None:
            return _model
        try:
            from sentence_transformers import SentenceTransformer
            from flask import current_app
            name = current_app.config["SBERT_MODEL_NAME"]
        except ImportError as exc:
            _model_error = (
                "sentence-transformers is not installed. Install it with: "
                "pip install sentence-transformers torch"
            )
            raise ModelUnavailableError(_model_error) from exc
        except Exception as exc:  # outside app context
            raise ModelUnavailableError(f"Model configuration error: {exc}") from exc
        try:
            _model = SentenceTransformer(name)
            return _model
        except Exception as exc:
            _model_error = (
                f"Could not load the {name} model. The first run needs internet access "
                f"to download it from Hugging Face (~90 MB). Error: {exc}"
            )
            raise ModelUnavailableError(_model_error) from exc


def model_status():
    """('ready' | 'unavailable', message) — used by /api/health and UI badges."""
    if _model is not None:
        return "ready", f"{_model.__class__.__name__} loaded"
    if _model_error:
        return "unavailable", _model_error
    return "not-loaded", (
        "The Sentence-BERT model has not been loaded yet. It loads on first use "
        "(first run downloads ~90 MB and needs internet access)."
    )


def analyze_transformer(resume_text, jd_text, resume_skills, jd_skills):
    """Run the SBERT pipeline and return the shared result payload."""
    started = time.perf_counter()
    model = get_model()

    model_limit = 2000  # within the encoder's context window
    emb_resume = model.encode(resume_text[:model_limit], normalize_embeddings=False)
    emb_jd = model.encode(jd_text[:model_limit], normalize_embeddings=False)
    cosine_value = float(cosine_similarity(
        np.asarray(emb_resume).reshape(1, -1),
        np.asarray(emb_jd).reshape(1, -1),
    )[0][0])
    cosine_value = max(0.0, min(1.0, cosine_value))
    cosine_pct = round(cosine_value * 100, 1)

    jd_list = sorted(jd_skills)
    matched = [s for s in jd_list if s in resume_skills]
    missing = [s for s in jd_list if s not in resume_skills]
    skill_pct = round(len(matched) / len(jd_list) * 100, 1) if jd_list else 0.0

    match_score = round(WEIGHT_SIMILARITY * cosine_pct + WEIGHT_SKILLS * skill_pct)
    strengths, recommendations = build_narrative(matched, missing, cosine_pct, skill_pct)

    matched_by_category = {}
    for skill in matched:
        matched_by_category.setdefault(skill_category(skill), []).append(skill)

    elapsed = round(time.perf_counter() - started, 3)

    return {
        "engine": ENGINE_NAME,
        "model_key": "transformer",
        "match_percentage": match_score,
        "suitability": {"label": suitability_label(match_score)},
        "cosine_label": COSINE_LABEL,
        "cosine_percentage": cosine_pct,
        "skill_percentage": skill_pct,
        "matched_skills": matched,
        "missing_skills": missing,
        "matched_by_category": matched_by_category,
        "strengths": strengths,
        "recommendations": recommendations,
        "shared_terms": [],
        "experience_alignment": experience_alignment(resume_text, jd_text),
        "education_alignment": education_alignment(resume_text, jd_text),
        "technical_skills_resume": sorted(resume_skills),
        "processing_time": elapsed,
        "details": [
            f"{model.get_config_dict().get('model_name', 'all-MiniLM-L6-v2') if hasattr(model, 'get_config_dict') else 'all-MiniLM-L6-v2'} "
            f"(Sentence-BERT) encodes both documents into dense 384-dimensional semantic embeddings.",
            f"Semantic cosine similarity between the embeddings: {cosine_value:.4f} (weight {WEIGHT_SIMILARITY}).",
            f"Skill coverage: {len(matched)}/{len(jd_list)} JD skills found in the resume = {skill_pct}% (weight {WEIGHT_SKILLS}).",
            f"Final score = {WEIGHT_SIMILARITY} x {cosine_pct} + {WEIGHT_SKILLS} x {skill_pct} = {match_score}%",
            "Strength: the Transformer understands meaning — paraphrases and synonyms score as relevant even without shared words.",
            "Skill identification uses the same curated taxonomy as the traditional implementation.",
        ],
        "disclaimer": (
            "A semantic similarity score measures meaning overlap with the job description. "
            "It is NOT a probability of employment and must not be used as an objective hiring decision."
        ),
    }
