"""User dashboard: stats API + page. Real metrics only — no fabricated values."""

import json
from datetime import timedelta, timezone

from flask import Blueprint, g, jsonify, render_template
from sqlalchemy import func, or_

from ..database.models import Analysis
from ..extensions import db
from ..transformer_nlp.sentence_bert import model_status as sbert_status
from .helpers import current_user

bp = Blueprint("dashboard", __name__)


@bp.get("/dashboard")
def dashboard_page():
    return render_template("dashboard.html")


@bp.get("/api/dashboard/stats")
def api_stats():
    q = Analysis.query
    user = current_user()
    if user:
        q = q.filter(or_(Analysis.user_id == user.id, Analysis.visitor_key == g.visitor_key))
    else:
        q = q.filter(Analysis.visitor_key == g.visitor_key)

    total = q.count()
    trad_used = q.filter(Analysis.model_name.in_(["traditional", "compare"])).count()
    trans_used = q.filter(Analysis.model_name.in_(["transformer", "compare"])).count()

    def _avg(column):
        value = q.filter(column.isnot(None)).with_entities(func.avg(column)).scalar()
        return round(value, 1) if value is not None else None

    stats = {
        "total_analyses": total,
        "traditional_usage": trad_used,
        "transformer_usage": trans_used,
        "avg_traditional_score": _avg(Analysis.traditional_score),
        "avg_transformer_score": _avg(Analysis.transformer_score),
        "transformer_status": sbert_status()[0],
    }

    # Score history (last 20 analyses, oldest first) for the performance chart
    recent = q.order_by(Analysis.created_at.desc()).limit(20).all()
    history = list(reversed(recent))
    stats["history"] = [
        {
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "job_title": a.job_title,
            "traditional_score": a.traditional_score,
            "transformer_score": a.transformer_score,
        }
        for a in history
    ]

    # Score distribution buckets (real, from stored analyses)
    scores = [s for a in recent for s in (a.traditional_score, a.transformer_score) if s is not None]
    buckets = {"0-24": 0, "25-49": 0, "50-74": 0, "75-100": 0}
    for s in scores:
        if s >= 75:
            buckets["75-100"] += 1
        elif s >= 50:
            buckets["50-74"] += 1
        elif s >= 25:
            buckets["25-49"] += 1
        else:
            buckets["0-24"] += 1
    stats["score_distribution"] = buckets

    stats["recent_analyses"] = [
        {
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "job_title": a.job_title,
            "company": a.company,
            "resume_filename": a.resume_filename,
            "model": a.model_name,
            "traditional_score": a.traditional_score,
            "transformer_score": a.transformer_score,
        }
        for a in recent[:8]
    ]
    return jsonify(stats)


@bp.get("/api/comparison/data")
def api_comparison_data():
    """Real experiment history: every stored 'compare' analysis."""
    user = current_user()
    if user:
        q = Analysis.query.filter(or_(Analysis.user_id == user.id, Analysis.visitor_key == g.visitor_key))
    else:
        q = Analysis.query.filter(Analysis.visitor_key == g.visitor_key)

    compares = q.filter(Analysis.model_name == "compare").order_by(Analysis.created_at.desc()).limit(30).all()
    experiments = []
    for a in compares:
        experiments.append({
            "id": a.id,
            "created_at": a.created_at.isoformat(),
            "job_title": a.job_title,
            "traditional_score": a.traditional_score,
            "transformer_score": a.transformer_score,
            "difference": round(a.transformer_score - a.traditional_score, 1)
            if a.traditional_score is not None and a.transformer_score is not None else None,
            "traditional_time": a.traditional_time,
            "transformer_time": a.transformer_time,
        })

    return jsonify({
        "experiments": experiments,
        "labelled_evaluation": {
            "status": "not_evaluated",
            "message": (
                "Precision, recall and F1 are not available yet: they require a labelled dataset "
                "(e.g. the Resume-Job Fit dataset) with a fixed train/test split. Upload a labelled "
                "CSV on the Dataset page to enable supervised evaluation in Phase 6."
            ),
            "precision": None,
            "recall": None,
            "f1": None,
        },
    })
