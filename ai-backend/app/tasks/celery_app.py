"""Optional Celery application for long-running dataset evaluations.

Celery/Redis are OPTIONAL: when REDIS_URL is configured, heavy evaluation runs
are queued here; without it, evaluations run inline (the API reports this
mode in its metadata). Nothing is faked in either mode.
"""

import os

from ..core.config import get_settings


def make_celery():
    settings = get_settings()
    if not settings.redis_url:
        return None
    try:
        from celery import Celery
    except ImportError:
        return None

    app = Celery(
        "rxrevive",
        broker=settings.redis_url,
        backend=settings.redis_url,
        include=["app.tasks.evaluation_tasks"],
    )
    app.conf.update(
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        task_track_started=True,
        task_time_limit=60 * 60,
        task_soft_time_limit=55 * 60,
    )
    return app


celery_app = make_celery()
BROKER_AVAILABLE = celery_app is not None and bool(os.environ.get("REDIS_URL"))
