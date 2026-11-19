"""Dataset validation endpoint: honest inspection of an uploaded CSV."""

import time

from fastapi import APIRouter, HTTPException

from ..evaluation.dataset_cleaner import clean
from ..evaluation.dataset_loader import DatasetError, load_csv
from ..schemas.common import Envelope

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("/validate")
def validate_dataset(body: dict) -> Envelope:
    started = time.perf_counter()
    content = body.get("dataset_content") or ""
    column_map = body.get("column_map")
    if not content.strip():
        raise HTTPException(status_code=422, detail="The dataset content is empty.")
    try:
        bundle = load_csv(content.encode("utf-8"), column_map)
        cleaned = clean(bundle)
    except DatasetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    report = cleaned["report"]
    return Envelope(
        success=True,
        data={
            "columns": bundle.columns,
            "total_rows": report["total_rows"],
            "valid_records": report["valid_records"],
            "invalid_records": report["invalid_records"],
            "duplicates_removed": report["duplicates_removed"],
            "label_distribution": report["label_distribution"],
            "missing_values": report["missing_values"],
            "issues": report["issues"],
            "dropped": report["dropped"],
            "suggested_class_order": sorted(report["label_distribution"], key=report["label_distribution"].get, reverse=True),
            "records": cleaned["records"][:50],  # preview; full set stays server-side
            "preview_truncated": len(cleaned["records"]) > 50,
        },
        metadata={"processing_time_ms": round((time.perf_counter() - started) * 1000)},
    )
