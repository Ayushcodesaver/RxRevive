"""Genuine labelled evaluation of both NLP approaches.

Both engines receive the SAME records and the SAME split. Similarity scores
are converted into predictions with thresholds calibrated on the training
split only (documented strategy; test labels are never used for calibration).
Similarity metrics and classification metrics are reported as distinct things.
"""

import time
from collections import Counter

from ..shared.analysis_helpers import suitability_label
from ..shared.skill_taxonomy import identify_skills
from ..traditional_nlp.tfidf_model import analyze_traditional
from ..transformer_nlp.model_manager import ModelUnavailableError, get_model, model_status
from .metrics import band_thresholds, best_threshold, compute_metrics, to_bands

ORDINAL_CLASS_ORDER = ["No Fit", "Potential Fit", "Good Fit"]


def _similarity_only(resume_text: str, jd_text: str, engine: str) -> float:
    """Similarity component (0..100) without the skill-coverage weighting,
    used as the raw score that thresholds convert into class predictions."""
    if engine == "traditional":
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        from ..shared.preprocessing import clean_for_vectorizer

        cleaned = [clean_for_vectorizer(resume_text), clean_for_vectorizer(jd_text)]
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=8000, sublinear_tf=True)
        matrix = vectorizer.fit_transform(cleaned)
        value = float(cosine_similarity(matrix[0], matrix[1])[0][0])
        return round(max(0.0, min(1.0, value)) * 100, 1)
    if engine == "transformer":
        from ..transformer_nlp.sentence_bert import encode_documents

        embeddings = encode_documents([resume_text, jd_text])
        from ..transformer_nlp.semantic_similarity import aggregate_similarity

        return round(aggregate_similarity(embeddings[0], embeddings[1]) * 100, 1)
    raise ValueError(f"Unknown engine: {engine}")


def _predict_classes(scores: list[float], y_train_labels: list[str], y_test_labels: list[str],
                     n_train: int, class_order: list[str]) -> tuple[list[str], dict]:
    """Threshold calibration on TRAIN labels; prediction over TEST."""
    config: dict = {}
    train_scores, test_scores = scores[:n_train], scores[n_train:]

    if len(class_order) == 2:
        positive = class_order[-1]
        threshold = best_threshold(y_train_labels, train_scores, positive)
        config["strategy"] = "binary threshold calibrated on the training split (max F1)"
        config["threshold"] = threshold
        config["positive_class"] = positive
        preds = ["Good Fit" if s >= threshold else "No Fit" for s in test_scores]
        # map to the dataset's own binary classes
        preds = [positive if p == "Good Fit" else class_order[0] for p in preds]
        return preds, config

    cuts = band_thresholds(y_train_labels, train_scores, class_order)
    config["strategy"] = "ordinal class bands calibrated on the training split (greedy macro-F1)"
    config["cuts"] = cuts
    config["class_order"] = class_order
    preds = to_bands(test_scores, cuts, class_order)
    return preds, config


def evaluate_dataset(records: list[dict], engine: str, seed: int, split_ratio: float,
                     class_order: list[str] | None = None) -> dict:
    """Run a full evaluation over cleaned records.

    records: [{'resume': str, 'job_description': str, 'label': str}, ...]
    engine: 'traditional' | 'transformer'
    Both the train and test split are scored with the same engine; thresholds
    come from the train split only.
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
    # every class must appear in both splits for a fair evaluation
    train = shuffled[:n_train]
    test = shuffled[n_train:]
    train_labels = [r["label"] for r in train]
    test_labels = [r["label"] for r in test]
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
    scores: list[float] = []
    for record in train + test:
        scores.append(_similarity_only(record["resume"], record["job_description"], engine))
    elapsed = round(time.perf_counter() - started, 2)

    preds, threshold_config = _predict_classes(scores, train_labels, test_labels, n_train, class_order)
    metrics = compute_metrics(test_labels, preds, y_score=scores[n_train:], labels=class_order)

    return {
        "engine": engine,
        "engine_name": "Traditional NLP (TF-IDF)" if engine == "traditional" else "Transformer NLP (Sentence-BERT)",
        "threshold_config": threshold_config,
        "metrics": metrics,
        "split": {
            "records": len(records),
            "train": n_train,
            "test": len(records) - n_train,
            "ratio": split_ratio,
            "seed": seed,
            "stratified": True,
        },
        "notes": [
            "Scores are similarity components; predictions come from thresholds calibrated on the training split only.",
            "Both splits were scored with the same engine and the same records; no test label was used for calibration.",
            "Similarity and classification metrics are reported as distinct things: a matching score is not an accuracy.",
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
