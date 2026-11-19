"""Transformer NLP engine: Sentence-BERT semantic matching (real inference).

Pipeline: normalize -> chunk -> embed -> aggregate cosine -> skill coverage ->
weighted final score -> explainable narrative. Uses actual model inference
from sentence-transformers/all-MiniLM-L6-v2; nothing is faked.
"""

import time

import numpy as np

from ..core.config import get_settings
from ..shared.analysis_helpers import (
    WEIGHT_SIMILARITY,
    WEIGHT_SKILLS,
    build_narrative,
    education_alignment,
    experience_alignment,
    suitability_label,
)
from ..shared.skill_taxonomy import skill_category
from .model_manager import ModelUnavailableError, get_model, model_status
from .semantic_similarity import aggregate_similarity, split_chunks

ENGINE_NAME = "Transformer NLP (Sentence-BERT)"
COSINE_LABEL = "Semantic similarity (SBERT cosine)"


def encode_documents(texts: list[str]) -> np.ndarray:
    """Embed documents with chunking; returns one embedding per chunk (rows)."""
    model = get_model()
    settings = get_settings()
    all_chunks: list[str] = []
    spans: list[tuple[int, int]] = []
    for text in texts:
        chunks = split_chunks(text, max_chars=min(settings.sbert_max_chars, 2000))
        start = len(all_chunks)
        all_chunks.extend(chunks)
        spans.append((start, len(all_chunks)))
    embeddings = model.encode(all_chunks, normalize_embeddings=False, show_progress_bar=False)
    embeddings = np.asarray(embeddings)
    # aggregate per document: mean of its chunk embeddings
    per_document = []
    for start, end in spans:
        per_document.append(embeddings[start:end].mean(axis=0))
    return np.vstack(per_document)


def analyze_transformer(resume_text: str, jd_text: str, resume_skills: set, jd_skills: set) -> dict:
    """Run the SBERT pipeline and return the shared result payload."""
    settings = get_settings()
    started = time.perf_counter()
    model = get_model()

    try:
        embeddings = encode_documents([resume_text, jd_text])
    except ModelUnavailableError:
        raise
    resume_emb, jd_emb = embeddings[0], embeddings[1]

    cosine_value = aggregate_similarity(resume_emb, jd_emb)
    cosine_pct = round(cosine_value * 100, 1)

    jd_list = sorted(jd_skills)
    matched = [s for s in jd_list if s in resume_skills]
    missing = [s for s in jd_list if s not in resume_skills]
    skill_pct = round(len(matched) / len(jd_list) * 100, 1) if jd_list else 0.0

    match_score = round(settings.score_weight_similarity * cosine_pct + settings.score_weight_skills * skill_pct)
    strengths, recommendations = build_narrative(matched, missing, cosine_pct, skill_pct)

    matched_by_category: dict[str, list[str]] = {}
    for skill in matched:
        matched_by_category.setdefault(skill_category(skill), []).append(skill)

    status, _, model_name = model_status()
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
            f"{model_name} (Sentence-BERT) encodes both documents into dense 384-dimensional semantic embeddings.",
            f"Long documents are split into overlapping sentence chunks and chunk similarities are aggregated by mean.",
            f"Semantic cosine similarity between the embeddings: {cosine_value:.4f} (weight {settings.score_weight_similarity}).",
            f"Skill coverage: {len(matched)}/{len(jd_list)} JD skills found in the resume = {skill_pct}% (weight {settings.score_weight_skills}).",
            f"Final score = {settings.score_weight_similarity} x {cosine_pct} + {settings.score_weight_skills} x {skill_pct} = {match_score}%",
            "Strength: the Transformer understands meaning; paraphrases and synonyms score as relevant even without shared words.",
            "Skill identification uses the same curated taxonomy as the traditional implementation.",
        ],
        "disclaimer": (
            "A semantic similarity score measures meaning overlap with the job description. "
            "It is NOT a probability of employment and must not be used as an objective hiring decision."
        ),
    }
