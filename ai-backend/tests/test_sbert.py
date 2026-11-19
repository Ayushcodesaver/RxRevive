"""Sentence-BERT engine tests: REAL inference, chunking, semantic behaviour.

These tests download/load all-MiniLM-L6-v2 on first run (~90 MB) and exercise
genuine model inference. They are skipped honestly when the model cannot load.
"""

import pytest

from app.shared.skill_taxonomy import identify_skills
from app.transformer_nlp.model_manager import ModelUnavailableError, get_model
from app.transformer_nlp.semantic_similarity import split_chunks
from app.transformer_nlp.sentence_bert import analyze_transformer, encode_documents


def _model_or_skip():
    try:
        return get_model()
    except ModelUnavailableError as exc:
        pytest.skip(f"SBERT model unavailable in this environment: {exc}")


def test_model_loads():
    model = _model_or_skip()
    assert model is not None


def test_embeddings_are_384_dimensional(sample_texts):
    _model_or_skip()
    embeddings = encode_documents([sample_texts["resume"], sample_texts["jd"]])
    assert embeddings.shape[0] == 2
    assert embeddings.shape[1] == 384


def test_chunking_covers_long_documents():
    text = " ".join(f"Sentence number {i} about machine learning work." for i in range(200))
    chunks = split_chunks(text)
    assert len(chunks) > 1
    assert all(len(c) <= 1300 for c in chunks)
    reassembled = " ".join(chunks)
    for i in (0, 50, 150, 199):
        assert f"Sentence number {i}" in reassembled


def test_sbert_prefers_semantic_match():
    _model_or_skip()
    resume = "Built deep learning models for text classification and deployed neural network solutions."
    paraphrase = "Developed neural network solutions and trained deep learning text classifiers."
    unrelated = "Managed a restaurant kitchen, hired staff and planned the weekly menu budget."

    resume_skills = identify_skills(resume)["skills"]
    same = analyze_transformer(resume, paraphrase, resume_skills, identify_skills(paraphrase)["skills"])
    other = analyze_transformer(resume, unrelated, resume_skills, identify_skills(unrelated)["skills"])
    assert same["cosine_percentage"] > other["cosine_percentage"]


def test_sbert_full_pipeline(sample_texts):
    _model_or_skip()
    resume_skills = identify_skills(sample_texts["resume"])["skills"]
    jd_skills = identify_skills(sample_texts["jd"])["skills"]
    result = analyze_transformer(sample_texts["resume"], sample_texts["jd"], resume_skills, jd_skills)
    assert 0 <= result["match_percentage"] <= 100
    assert result["cosine_percentage"] > 0
    assert "384" in result["details"][0]
    assert result["processing_time"] >= 0
    assert result["disclaimer"].startswith("A semantic similarity")
