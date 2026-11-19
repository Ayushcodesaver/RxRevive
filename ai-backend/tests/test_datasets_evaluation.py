"""Dataset loading, cleaning and labelled evaluation tests (TF-IDF, fast)."""

import pytest

from app.evaluation.dataset_cleaner import canonical_label, clean
from app.evaluation.dataset_loader import DatasetError, load_csv
from app.evaluation.metrics import band_thresholds, best_threshold, compute_metrics, to_bands
from app.evaluation.evaluate import evaluate_dataset


def _row(a: str, b: str, label: str) -> str:
    return f"{a},{b},{label}"


CSV = "\n".join(
    ["resume,job_description,label"]
    + [
        _row(f"Python developer with machine learning experience {i} scikit-learn pandas numpy tensorflow docker",
             f"Data scientist role needing python machine learning scikit-learn pandas aws docker {i}",
             "Good Fit")
        for i in range(6)
    ]
    + [
        _row(f"Graphic designer portfolio branding illustration photoshop {i} figma typography",
             f"Nurse practitioner position cardiac ward patient care scheduling {i}",
             "No Fit")
        for i in range(6)
    ]
)


def test_loader_maps_columns():
    bundle = load_csv(CSV.encode())
    assert bundle.columns == ["resume", "job_description", "label"]
    assert len(bundle.records) == 12


def test_loader_requires_mapping():
    with pytest.raises(DatasetError):
        load_csv(b"col1,col2\n1,2")


def test_cleaner_reports_honestly():
    bundle = load_csv(CSV.encode())
    cleaned = clean(bundle)
    assert cleaned["report"]["valid_records"] == 12
    assert cleaned["report"]["label_distribution"] == {"Good Fit": 6, "No Fit": 6}


def test_canonical_labels():
    assert canonical_label("good fit") == "Good Fit"
    assert canonical_label("NO FIT") == "No Fit"
    assert canonical_label("weird label") == "weird label"


def test_threshold_calibration_uses_train_only():
    y_train = ["No Fit"] * 5 + ["Good Fit"] * 5
    scores = [10, 12, 14, 16, 18, 80, 82, 84, 86, 88]
    t = best_threshold(y_train, scores, "Good Fit")
    assert 18 <= t <= 80


def test_band_thresholds_ordinal():
    y_train = (["No Fit"] * 4 + ["Potential Fit"] * 4 + ["Good Fit"] * 4)
    scores = [5, 10, 15, 20, 45, 50, 55, 60, 85, 90, 95, 99]
    cuts = band_thresholds(y_train, scores, ["No Fit", "Potential Fit", "Good Fit"])
    assert len(cuts) == 2
    assert cuts[0] < cuts[1]
    preds = to_bands([12, 50, 95], cuts, ["No Fit", "Potential Fit", "Good Fit"])
    assert preds == ["No Fit", "Potential Fit", "Good Fit"]


def test_compute_metrics_full_set():
    metrics = compute_metrics(["A", "A", "B", "B"], ["A", "B", "B", "B"], y_score=[0.9, 0.4, 0.8, 0.7], labels=["A", "B"])
    assert metrics["accuracy"] == 0.75
    assert len(metrics["confusion_matrix"]["matrix"]) == 2
    assert "A" in metrics["per_class"] and "B" in metrics["per_class"]
    assert metrics["roc_auc"] is not None


def test_evaluation_tfidf_end_to_end():
    records = [
        {"resume": row.split(",")[0], "job_description": row.split(",")[1], "label": row.split(",")[2]}
        for row in CSV.split("\n")[1:]
    ]
    result = evaluate_dataset(records, "traditional", seed=42, split_ratio=0.7)
    assert result["engine"] == "traditional"
    assert result["metrics"]["evaluated_records"] >= 2
    assert result["threshold_config"]["strategy"].startswith("binary threshold")
    assert result["metrics"]["accuracy"] >= 0.5
