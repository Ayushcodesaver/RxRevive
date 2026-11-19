"""Evaluation metrics: accuracy, precision, recall, F1, confusion matrix, ROC-AUC.

Implemented with scikit-learn; every metric here is computed from real
predictions against real labels. Nothing is estimated or fabricated.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
    precision_score,
    recall_score,
    roc_auc_score,
)


def compute_metrics(y_true: list, y_pred: list, y_score: list | None = None, labels: list | None = None) -> dict:
    """Full metric set for a labelled evaluation run."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    present_labels = sorted(set(y_true) | set(y_pred)) if labels is None else labels

    accuracy = float(accuracy_score(y_true, y_pred))
    precision_macro = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    recall_macro = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
    precision_micro = float(precision_score(y_true, y_pred, average="micro", zero_division=0))
    recall_micro = float(recall_score(y_true, y_pred, average="micro", zero_division=0))

    matrix = confusion_matrix(y_true, y_pred, labels=present_labels)

    per_class: dict[str, dict] = {}
    precisions, recalls, f1s, support = precision_recall_fscore_support(
        y_true, y_pred, labels=present_labels, zero_division=0
    )
    for i, label in enumerate(present_labels):
        per_class[str(label)] = {
            "precision": round(float(precisions[i]), 4),
            "recall": round(float(recalls[i]), 4),
            "f1": round(float(f1s[i]), 4),
            "support": int(support[i]),
        }

    roc_auc = None
    if y_score is not None and len(present_labels) == 2:
        scores = np.asarray(y_score, dtype=float)
        binary_true = (y_true == present_labels[-1]).astype(int)
        if len(np.unique(binary_true)) == 2:
            roc_auc = float(roc_auc_score(binary_true, scores))

    return {
        "accuracy": round(accuracy, 4),
        "precision_macro": round(precision_macro, 4),
        "recall_macro": round(recall_macro, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "precision_micro": round(precision_micro, 4),
        "recall_micro": round(recall_micro, 4),
        "confusion_matrix": {
            "labels": [str(l) for l in present_labels],
            "matrix": matrix.tolist(),
        },
        "per_class": per_class,
        "classification_report": classification_report(y_true, y_pred, labels=present_labels, zero_division=0),
        "roc_auc": round(roc_auc, 4) if roc_auc is not None else None,
        "evaluated_records": int(len(y_true)),
    }


def best_threshold(y_true: list, scores: list[float], positive: str) -> float:
    """Pick the similarity threshold that maximises F1 on TRAIN data only.

    The threshold is calibrated on the training split and applied unchanged to
    the test split, so the test metrics stay honest.
    """
    y_true_arr = np.asarray(y_true)
    scores_arr = np.asarray(scores, dtype=float)
    binary = (y_true_arr == positive).astype(int)
    candidates = np.unique(np.quantile(scores_arr, np.linspace(0.05, 0.95, 19)))
    best_t, best_f1 = 0.5, -1.0
    for t in candidates:
        preds = (scores_arr >= t).astype(int)
        value = f1_score(binary, preds, zero_division=0)
        if value > best_f1:
            best_f1, best_t = value, float(t)
    return round(best_t, 4)


def band_thresholds(y_true: list, scores: list[float], class_order: list[str]) -> list[float]:
    """Learn class-band cut points on TRAIN data for ordinal multiclass labels.

    Class order must run from lowest score class to highest (e.g.
    ['No Fit', 'Potential Fit', 'Good Fit']). Returns len(order)-1 cut points
    chosen to maximise macro-F1 on the training split.
    """
    y_true_arr = np.asarray(y_true)
    scores_arr = np.asarray(scores, dtype=float)
    if len(class_order) < 2:
        return []

    def to_bands(values: list[float], cuts: list[float]) -> list[str]:
        preds = []
        for s in values:
            index = len([c for c in cuts if s >= c])
            preds.append(class_order[min(index, len(class_order) - 1)])
        return preds

    grid = np.unique(np.quantile(scores_arr, np.linspace(0.1, 0.9, 17)))
    cuts: list[float] = []
    for i in range(len(class_order) - 1):
        remaining_low = len(class_order) - 1 - i
        candidates = [float(t) for t in grid if not cuts or t > cuts[-1]]
        best_t, best_f1 = (scores_arr.min() + scores_arr.max()) / 2, -1.0
        for t in candidates:
            trial = cuts + [t]
            # provisional upper cuts spread across the remaining range
            provisional = trial + [float(t + (scores_arr.max() - t) * (j + 1) / (remaining_low + 1)) for j in range(remaining_low - 1)]
            preds = to_bands(scores_arr, provisional)
            value = f1_score(y_true_arr, preds, average="macro", zero_division=0)
            if value > best_f1:
                best_f1, best_t = value, t
        cuts.append(round(best_t, 4))
    return cuts


def to_bands(scores: list[float], cuts: list[float], class_order: list[str]) -> list[str]:
    preds = []
    for s in scores:
        index = len([c for c in cuts if s >= c])
        preds.append(class_order[min(index, len(class_order) - 1)])
    return preds
