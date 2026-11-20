"""RxRevive AI backend: FastAPI application factory.

The Python service owns ALL NLP computation (text extraction, TF-IDF,
Sentence-BERT inference, dataset evaluation, PDF reports). Application data
and workflow state live in Convex; authentication lives in Clerk. This service
never stores users or passwords.
"""

import time
from contextvars import ContextVar

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import analyze, assist, datasets, evaluation, health, reports, resumes, skills
from .core.config import get_settings
from .core.logging import new_request_id, request_id_var, setup_logging

settings = get_settings()
setup_logging(settings.debug)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "RxRevive AI service: TF-IDF and Sentence-BERT resume matching, "
            "labelled dataset evaluation and PDF report generation."
        ),
    )

    import os
    allowed = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    origins = [o.strip() for o in allowed.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", "X-API-Secret", "X-User-Id"],
        expose_headers=["X-Request-Id"],
    )

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = new_request_id()
        request_id_var.set(request_id)
        request.state.request_id = request_id
        started = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:  # last-resort handler: structured JSON, no stack leak
            from .core.logging import get_logger

            get_logger(__name__).exception("unhandled error")
            response = JSONResponse(
                status_code=500,
                content={"success": False, "data": None, "error": "Internal server error.", "request_id": request_id},
            )
        response.headers["X-Request-Id"] = request_id
        response.headers["Server-Timing"] = f"app;dur={round((time.perf_counter() - started) * 1000)}"
        return response

    api_prefix = "/api/v1"
    app.include_router(health.router, prefix=api_prefix)
    app.include_router(skills.router, prefix=api_prefix)
    app.include_router(assist.router, prefix=api_prefix)
    app.include_router(resumes.router, prefix=api_prefix)
    app.include_router(analyze.router, prefix=api_prefix)
    app.include_router(datasets.router, prefix=api_prefix)
    app.include_router(evaluation.router, prefix=api_prefix)
    app.include_router(reports.router, prefix=api_prefix)

    @app.get("/")
    def root() -> dict:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": "/api/v1/health",
        }

    return app


app = create_app()
