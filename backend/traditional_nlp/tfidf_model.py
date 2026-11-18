"""Traditional NLP engine: TF-IDF vectorization + cosine similarity."""

import time

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..shared.analysis_helpers import (
    WEIGHT_SIMILARITY,
    WEIGHT_SKILLS,
    build_narrative,
    education_alignment,
    experience_alignment,
    suitability_label,
)
from ..shared.preprocessing import clean_for_vectorizer
from ..shared.skill_extractor import skill_category

ENGINE_NAME = "Traditional NLP (TF-IDF + Cosine Similarity)"
TOP_TERMS = 25


def _top_shared_terms(vectorizer, matrix):
    feature_names = np.array(vectorizer.get_feature_names_out())
    resume_weights = matrix[0].toarray().ravel()
    jd_weights = matrix[1].toarray().ravel()
    if feature_names.size == 0:
        return []
    r_top = set(feature_names[np.argsort(resume_weights)[-TOP_TERMS:]])
    j_top = set(feature_names[np.argsort(jd_weights)[-TOP_TERMS:]])
    shared = sorted(r_top & j_top)
    shared.sort(key=lambda t: (-len(t.split()), t))
    return [t for t in shared if len(t) > 2][:12]


def analyze_traditional(resume_text, jd_text, resume_skills, jd_skills):
    """Run the TF-IDF pipeline and return the shared result payload."""
    started = time.perf_counter()

    cleaned_resume = clean_for_vectorizer(resume_text)
    cleaned_jd = clean_for_vectorizer(jd_text)

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=8000,
        sublinear_tf=True,
        min_df=1,
    )
    matrix = vectorizer.fit_transform([cleaned_resume, cleaned_jd])
    cosine_value = float(cosine_similarity(matrix[0], matrix[1])[0][0])
    cosine_value = max(0.0, min(1.0, cosine_value))
    cosine_pct = round(cosine_value * 100, 1)

    jd_list = sorted(jd_skills)
    matched = [s for s in jd_list if s in resume_skills]
    missing = [s for s in jd_list if s not in resume_skills]
    skill_pct = round(len(matched) / len(jd_list) * 100, 1) if jd_list else 0.0

    match_score = round(WEIGHT_SIMILARITY * cosine_pct + WEIGHT_SKILLS * skill_pct)
    shared_terms = _top_shared_terms(vectorizer, matrix)

    strengths, recommendations = build_narrative(matched, missing, cosine_pct, skill_pct, shared_terms)

    matched_by_category = {}
    for skill in matched:
        matched_by_category.setdefault(skill_category(skill), []).append(skill)

    elapsed = round(time.perf_counter() - started, 3)

    return {
        "engine": ENGINE_NAME,
        "model_key": "traditional",
        "match_percentage": match_score,
        "suitability": {"label": suitability_label(match_score)},
        "cosine_label": "Lexical similarity (TF-IDF cosine)",
        "cosine_percentage": cosine_pct,
        "skill_percentage": skill_pct,
        "matched_skills": matched,
        "missing_skills": missing,
        "matched_by_category": matched_by_category,
        "strengths": strengths,
        "recommendations": recommendations,
        "shared_terms": shared_terms,
        "experience_alignment": experience_alignment(resume_text, jd_text),
        "education_alignment": education_alignment(resume_text, jd_text),
        "technical_skills_resume": sorted(resume_skills),
        "processing_time": elapsed,
        "details": [
            f"TF-IDF vectorization (unigrams + bigrams, English stop words removed, {matrix.shape[1]} features).",
            f"Lexical cosine similarity: {cosine_value:.4f} (weight {WEIGHT_SIMILARITY}).",
            f"Skill coverage: {len(matched)}/{len(jd_list)} JD skills found in the resume = {skill_pct}% (weight {WEIGHT_SKILLS}).",
            f"Final score = {WEIGHT_SIMILARITY} x {cosine_pct} + {WEIGHT_SKILLS} x {skill_pct} = {match_score}%",
            f"Top shared terms: {', '.join(shared_terms) if shared_terms else '(no significant overlap)'}",
            "Limitation: TF-IDF matches words, not meaning — synonyms that use different words are not credited.",
        ],
        "disclaimer": (
            "A similarity score measures textual and skill overlap with the job description. "
            "It is NOT a probability of employment and must not be used as an objective hiring decision."
        ),
    }
