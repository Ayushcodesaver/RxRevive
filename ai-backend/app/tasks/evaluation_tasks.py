"""Celery task: run a labelled evaluation in the background.

Only reachable when Redis/Celery are configured; the API reports the queued
task id, and the result lands in the Celery backend for polling.
"""

from .celery_app import celery_app

if celery_app is not None:

    @celery_app.task(name="evaluation.run")
    def run_evaluation_task(dataset_content: str, column_map: dict | None,
                            engines: list[str], split_ratio: float, seed: int,
                            class_order: list | None) -> dict:
        from ..evaluation.dataset_cleaner import clean
        from ..evaluation.dataset_loader import load_csv
        from ..evaluation.evaluate import compare_engines

        bundle = load_csv(dataset_content.encode("utf-8"), column_map)
        cleaned = clean(bundle)
        if not cleaned["records"]:
            raise ValueError("No usable records remain after cleaning; nothing was evaluated.")
        return compare_engines(cleaned["records"], seed, split_ratio, class_order)
