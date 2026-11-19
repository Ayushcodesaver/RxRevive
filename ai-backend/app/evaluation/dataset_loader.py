"""Labelled dataset loading with configurable column mapping.

The loader is honest: it reports exactly what it found, never invents
statistics, and keeps raw rows alongside parsed ones for the validation report.
"""

import csv
import io
from dataclasses import dataclass, field


class DatasetError(Exception):
    """Raised when a dataset cannot be parsed at all."""


@dataclass
class DatasetRecord:
    index: int
    resume: str
    job_description: str
    label: str
    raw: dict


@dataclass
class DatasetBundle:
    records: list[DatasetRecord]
    columns: list[str]
    issues: list[str] = field(default_factory=list)
    duplicates: int = 0
    missing_values: dict[str, int] = field(default_factory=dict)
    label_distribution: dict[str, int] = field(default_factory=dict)


def load_csv(content: bytes, column_map: dict[str, str] | None = None) -> DatasetBundle:
    """Parse CSV bytes into records.

    column_map: {"resume": "<column>", "job_description": "<column>", "label": "<column>"}
    When omitted, sensible defaults ('resume', 'job_description', 'label') are tried,
    then the first three text columns in file order (documented in the issues list).
    """
    text = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise DatasetError("The CSV has no header row.")
    columns = list(reader.fieldnames)
    rows = [row for row in reader]

    mapping = _resolve_mapping(columns, column_map, rows)
    bundle = DatasetBundle(records=[], columns=columns)
    if mapping is None:
        raise DatasetError(
            "Could not map the required columns. Pass a column_map of "
            "{'resume': ..., 'job_description': ..., 'label': ...}; available columns: "
            + ", ".join(columns)
        )
    bundle.issues.append("Column mapping: " + ", ".join(f"{k} -> '{v}'" for k, v in mapping.items()))

    seen_hashes: set[tuple] = set()
    for i, row in enumerate(rows):
        resume = (row.get(mapping["resume"]) or "").strip()
        jd = (row.get(mapping["job_description"]) or "").strip()
        label = (row.get(mapping["label"]) or "").strip()
        for key, value in (("resume", resume), ("job_description", jd), ("label", label)):
            if not value:
                bundle.missing_values[key] = bundle.missing_values.get(key, 0) + 1
        digest = (resume[:500], jd[:500], label)
        if digest in seen_hashes:
            bundle.duplicates += 1
            continue
        seen_hashes.add(digest)
        bundle.records.append(DatasetRecord(index=i, resume=resume, job_description=jd, label=label, raw=row))

    for record in bundle.records:
        bundle.label_distribution[record.label or "(missing)"] = bundle.label_distribution.get(record.label or "(missing)", 0) + 1
    return bundle


def _resolve_mapping(columns: list[str], column_map: dict | None, rows: list[dict]) -> dict | None:
    lowered = {c.lower().strip(): c for c in columns}
    if column_map:
        resolved = {}
        for key, value in column_map.items():
            actual = lowered.get((value or "").lower().strip(), value if value in columns else None)
            if actual is None:
                return None
            resolved[key] = actual
        return resolved

    # defaults by common names
    candidates = {
        "resume": ["resume", "resume_text", "cv", "candidate_resume"],
        "job_description": ["job_description", "jd", "job", "description", "job_text"],
        "label": ["label", "fit", "fit_label", "target", "class"],
    }
    resolved = {}
    for key, names in candidates.items():
        for name in names:
            if name in lowered:
                resolved[key] = lowered[name]
                break
    if all(k in resolved for k in ("resume", "job_description", "label")):
        return resolved

    # fallback: first three text columns in order (documented)
    if len(columns) >= 3:
        return {"resume": columns[0], "job_description": columns[1], "label": columns[2]}
    return None
