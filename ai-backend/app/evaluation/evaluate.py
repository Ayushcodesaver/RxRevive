"""Genuine labelled evaluation of both NLP approaches.

Both engines receive the SAME records and the SAME split. Classification
predictions come from thresholds calibrated on the training split only
(test labels are never used for calibration). Two scoring variants are
reported for each engine:

- "similarity": raw document similarity (the single lexical/semantic signal)
- "final": the product's own hybrid score 0.6 x similarity + 0.4 x skill
  coverage — the same number the results page shows

Similarity metrics and classification metrics are reported as distinct things.
"""

import time
from collections import Counter

from ..shared.analysis_helpers import suitability_label
from ..shared.skill_taxonomy import identify_skills
from ..traditional_nlp.tfidf_model import analyze_traditional
from ..transformer_nlp.model_manager import ModelUnavailableError, get_model, model_status
from .metrics import band_thresholds, compute_metrics, to_bands

ORDINAL_CLASS_ORDER = ["No Fit", "Potential Fit", "Good Fit"]


def _documents_score(resume_text: str, jd_text: str, resume_skills: set, jd_skills: set,
                     engine: str) -> dict:
    """Per-record scores: raw similarity and the hybrid final score (0-100)."""
    settings = __import__("app.core.config", fromlist=["get_settings"]).get_settings()
    if engine == "traditional":
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        from ..shared.preprocessing import clean_for_vectorizer

        cleaned = [clean_for_vectorizer(resume_text), clean_for_vectorizer(jd_text)]
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000, sublinear_tf=True)
        matrix = vectorizer.fit_transform(cleaned)
        value = float(cosine_similarity(matrix[0], matrix[1])[0][0])
        similarity = round(max(0.0, min(1.0, value)) * 100, 1)
    elif engine == "transformer":
        from ..transformer_nlp.sentence_bert import encode_documents

        embeddings = encode_documents([resume_text, jd_text])
        from ..transformer_nlp.semantic_similarity import aggregate_similarity

        similarity = round(aggregate_similarity(embeddings[0], embeddings[1]) * 100, 1)
    else:
        raise ValueError(f"Unknown engine: {engine}")

    jd_list = sorted(jd_skills)
    matched = [s for s in jd_list if s in resume_skills]
    skill_pct = round(len(matched) / len(jd_list) * 100, 1) if jd_list else 0.0
    final = round(settings.score_weight_similarity * similarity
                  + settings.score_weight_skills * skill_pct, 1)
    return {"similarity": similarity, "final": final, "skill_pct": skill_pct}


def _predict_classes(scores_train: list[float], labels_train: list[str],
                     scores_test: list[float], class_order: list[str]) -> tuple[list[str], dict]:
    """Threshold calibration on TRAIN labels; prediction over TEST."""
    config: dict = {}
    if len(class_order) == 2:
        from .metrics import best_threshold

        positive = class_order[-1]
        threshold = best_threshold(labels_train, scores_train, positive)
        config["strategy"] = "binary threshold calibrated on the training split (max F1)"
        config["threshold"] = threshold
        config["positive_class"] = positive
        preds = []
        for s in scores_test:
            # map the two real classes onto the score order
            preds.append(positive if s >= threshold else class_order[0])
        return preds, config

    cuts = band_thresholds(labels_train, scores_train, class_order)
    config["strategy"] = "ordinal class bands calibrated on the training split (greedy macro-F1)"
    config["cuts"] = cuts
    config["class_order"] = class_order
    return to_bands(scores_test, cuts, class_order), config


def evaluate_dataset(records: list[dict], engine: str, seed: int, split_ratio: float,
                     class_order: list[str] | None = None) -> dict:
    """Run a full evaluation over cleaned records.

    records: [{'resume': str, 'job_description': str, 'label': str}, ...]
    engine: 'traditional' | 'transformer'
    Returns metric sets for BOTH scoring variants (similarity-only and the
    hybrid final score), each calibrated on the train split only.
    """
    if engine not in ("traditional", "transformer"):
        raise ValueError("engine must be 'traditional' or 'transformer'")
    if engine == "transformer":
        status, message, _ = model_status()
        if status == "unavailable":
            raise ModelUnavailableError(message)
        get_model()  # force load before timing anything

    if class_order is None:
        present = Counter(r["label"] for r in records)
        class_order = [c for c in ORDINAL_CLASS_ORDER if c in present] + \
                      [c for c in present if c not in ORDINAL_CLASS_ORDER]
    if len(class_order) < 2:
        raise ValueError("A labelled evaluation needs at least two distinct classes.")

    rng = __import__("random").Random(seed)
    shuffled = list(records)
    rng.shuffle(shuffled)

    n_train = max(2, int(len(shuffled) * split_ratio))
    train = shuffled[:n_train]
    test = shuffled[n_train:]
    train_labels = [r["label"] for r in train]
    test_labels = [r["label"] for r in test]
    stratified = True
    if len(set(test_labels)) < len(class_order):
        # fall back to a stratified split so every class is represented
        by_class: dict[str, list[dict]] = {}
        for r in shuffled:
            by_class.setdefault(r["label"], []).append(r)
        train, test = [], []
        for label, rows in by_class.items():
            k = max(1, int(len(rows) * split_ratio))
            train.extend(rows[:k])
            test.extend(rows[k:])
        rng.shuffle(train)
        rng.shuffle(test)
        train_labels = [r["label"] for r in train]
        test_labels = [r["label"] for r in test]
        n_train = len(train)

    started = time.perf_counter()
    scores = {"similarity": {"train": [], "test": []}, "final": {"train": [], "test": []}}
    for split_name, split in (("train", train), ("test", test)):
        for record in split:
            resume_skills = identify_skills(record["resume"])["skills"]
            jd_skills = identify_skills(record["job_description"])["skills"]
            computed = _documents_score(record["resume"], record["job_description"],
                                        resume_skills, jd_skills, engine)
            scores["similarity"][split_name].append(computed["similarity"])
            scores["final"][split_name].append(computed["final"])
    elapsed = round(time.perf_counter() - started, 2)

    results: dict = {}
    for variant in ("similarity", "final"):
        all_scores = scores[variant]["train"] + scores[variant]["test"]
        preds, threshold_config = _predict_classes(
            scores[variant]["train"], train_labels,
            scores[variant]["test"], class_order,
        )
        results[variant] = {
            "variant": variant,
            "metrics": compute_metrics(test_labels, preds, y_score=all_scores[n_train:], labels=class_order),
            "threshold_config": threshold_config,
        }

    return {
        "engine": engine,
        "engine_name": "Traditional NLP (TF-IDF)" if engine == "traditional" else "Transformer NLP (Sentence-BERT)",
        "results": results,
        "split": {
            "records": len(records),
            "train": n_train,
            "test": len(records) - n_train,
            "ratio": split_ratio,
            "seed": seed,
            "stratified": stratified,
        },
        "notes": [
            "Two scoring variants: raw document similarity vs the product's hybrid final score (0.6 similarity + 0.4 skill coverage).",
            "Thresholds/bands are calibrated on the training split only; no test label is used for calibration.",
            "Similarity and classification metrics are distinct: a matching score is not an accuracy.",
        ],
        "computation_seconds": elapsed,
    }


def compare_engines(records: list[dict], seed: int, split_ratio: float, class_order: list[str] | None = None) -> dict:
    """Evaluate both engines over the identical split; returns both metric sets."""
    return {
        "traditional": evaluate_dataset(records, "traditional", seed, split_ratio, class_order),
        "transformer": evaluate_dataset(records, "transformer", seed, split_ratio, class_order),
        "fairness": [
            "Both engines received the identical record split, the identical labels and the same calibration budget.",
            "Predictive differences therefore come from the engines, not from the evaluation procedure.",
        ],
    }
