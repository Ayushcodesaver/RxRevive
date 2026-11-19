"""Dataset cleaning: filter unusable rows, normalise labels, report honestly."""

import re
from collections import Counter

MIN_TEXT_CHARS = 60

CANONICAL_LABELS = {
    "good fit": "Good Fit",
    "good": "Good Fit",
    "potential fit": "Potential Fit",
    "potential": "Potential Fit",
    "maybe": "Potential Fit",
    "no fit": "No Fit",
    "not a fit": "No Fit",
    "no": "No Fit",
}


def canonical_label(raw: str) -> str:
    return CANONICAL_LABELS.get(raw.strip().lower(), raw.strip())


def clean(bundle, max_chars_per_field: int = 20_000) -> dict:
    """Return {'records': [...], 'report': {...}} after dropping unusable rows."""
    dropped = Counter()
    records = []
    for record in bundle.records:
        if len(record.resume) < MIN_TEXT_CHARS:
            dropped["resume too short"] += 1
            continue
        if len(record.job_description) < MIN_TEXT_CHARS:
            dropped["job description too short"] += 1
        if not record.label:
            dropped["missing label"] += 1
            continue
        records.append(
            {
                "index": record.index,
                "resume": record.resume[:max_chars_per_field],
                "job_description": record.job_description[:max_chars_per_field],
                "label": canonical_label(record.label),
            }
        )

    labels = Counter(r["label"] for r in records)
    report = {
        "total_rows": len(bundle.records) + sum(dropped.values()) + bundle.duplicates,
        "parsed_rows": len(bundle.records),
        "duplicates_removed": bundle.duplicates,
        "dropped": dict(dropped),
        "valid_records": len(records),
        "invalid_records": sum(dropped.values()) + bundle.duplicates,
        "label_distribution": dict(labels),
        "missing_values": bundle.missing_values,
        "issues": bundle.issues,
    }
    return {"records": records, "report": report}


def binary_mask(labels: list[str], positive: str) -> list[int]:
    """1 for the positive class, 0 for everything else (documented strategy)."""
    return [1 if label == positive else 0 for label in labels]
