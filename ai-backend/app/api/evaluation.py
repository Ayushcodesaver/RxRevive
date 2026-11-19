"""Evaluation endpoints: run a labelled evaluation over one or both engines."""

import time

from fastapi import APIRouter, HTTPException

from ..core.logging import get_logger
from ..evaluation.dataset_cleaner import clean
from ..evaluation.dataset_loader import DatasetError, load_csv
from ..evaluation.evaluate import compare_engines, evaluate_dataset
from ..schemas.common import Envelope
from ..tasks.celery_app import BROKER_AVAILABLE

logger = get_logger(__name__)
router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.post("/run")
def run_evaluation(body: dict) -> Envelope:
    started = time.perf_counter()
    content = body.get("dataset_content") or ""
    column_map = body.get("column_map")
    engines = body.get("engines") or ["traditional", "transformer"]
    split_ratio = body.get("split_ratio", 0.7)
    seed = body.get("seed", 42)
    class_order = body.get("class_order")

    if not content.strip():
        raise HTTPException(status_code=422, detail="The dataset content is empty.")
    if not isinstance(engines, list) or not engines or not set(engines) <= {"traditional", "transformer"}:
        raise HTTPException(status_code=422, detail="engines must be a list drawn from ['traditional', 'transformer'].")

    try:
        bundle = load_csv(content.encode("utf-8"), column_map)
        cleaned = clean(bundle)
    except DatasetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not cleaned["records"]:
        raise HTTPException(
            status_code=422,
            detail="No usable records remain after cleaning. Check the validation report and column mapping.",
        )

    try:
        if len(engines) == 2:
            result = compare_engines(cleaned["records"], seed, split_ratio, class_order)
        else:
            # consistent per-engine shape regardless of engine count
            result = {engines[0]: evaluate_dataset(cleaned["records"], engines[0], seed, split_ratio, class_order)}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # model load failure and the like
        logger.error("evaluation failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Envelope(
        success=True,
        data={
            "results": result,
            "validation": {k: v for k, v in cleaned["report"].items() if k != "issues"},
            "queued": False,
            "execution": "inline" if not BROKER_AVAILABLE else "inline (broker configured but task not queued)",
        },
        metadata={"processing_time_ms": round((time.perf_counter() - started) * 1000)},
    )


@router.get("/{evaluation_id}")
def get_evaluation(evaluation_id: str) -> Envelope:
    raise HTTPException(
        status_code=501,
        detail=(
            "Evaluation persistence lives in Convex; the Python service computes results statelessly. "
            "Store the returned payload via the Next.js API routes (see BUILD_STATUS.md)."
        ),
    )
