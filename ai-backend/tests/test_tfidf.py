"""TF-IDF engine tests: real vectorization, identical inputs, explainability."""

from app.shared.skill_taxonomy import identify_skills
from app.traditional_nlp.tfidf_model import analyze_traditional


def test_tfidf_runs_and_scores(sample_texts):
    resume_skills = identify_skills(sample_texts["resume"])["skills"]
    jd_skills = identify_skills(sample_texts["jd"])["skills"]
    result = analyze_traditional(sample_texts["resume"], sample_texts["jd"], resume_skills, jd_skills)

    assert 0 <= result["match_percentage"] <= 100
    assert 0 <= result["cosine_percentage"] <= 100
    assert result["skill_percentage"] >= 0
    assert result["matched_skills"], "the sample pair must share taxonomy skills"
    assert result["details"], "results must be explainable"
    assert "TF-IDF" in result["engine"]


def test_tfidf_identical_text_scores_high(sample_texts):
    text = sample_texts["resume"]
    skills = identify_skills(text)["skills"]
    result = analyze_traditional(text, text, skills, skills)
    assert result["cosine_percentage"] == 100.0
    assert result["skill_percentage"] == 100.0
    assert result["match_percentage"] == 100


def test_tfidf_disjoint_texts_score_low():
    a = "Sunset photography portfolio with landscape galleries and print pricing."
    b = "Registered nurse position in the cardiac ward with night shifts."
    skills_a = identify_skills(a)["skills"]
    skills_b = identify_skills(b)["skills"]
    result = analyze_traditional(a, b, skills_a, skills_b)
    assert result["match_percentage"] <= 30


def test_tfidf_formula(sample_texts):
    resume_skills = identify_skills(sample_texts["resume"])["skills"]
    jd_skills = identify_skills(sample_texts["jd"])["skills"]
    result = analyze_traditional(sample_texts["resume"], sample_texts["jd"], resume_skills, jd_skills)
    expected = round(0.6 * result["cosine_percentage"] + 0.4 * result["skill_percentage"])
    assert result["match_percentage"] == expected


def test_tfidf_processing_time_recorded(sample_texts):
    skills = identify_skills(sample_texts["resume"])["skills"]
    result = analyze_traditional(sample_texts["resume"], sample_texts["resume"], skills, skills)
    assert result["processing_time"] >= 0
