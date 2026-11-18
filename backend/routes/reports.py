"""Report management: history list with search/filters, detail, PDF download, delete."""

import json

from flask import Blueprint, current_app, g, jsonify, render_template, request, send_from_directory
from sqlalchemy import or_

from ..database.models import Analysis, ReportFile
from ..extensions import db
from ..reports.report_generator import ensure_report
from .helpers import current_user, fail, ok

bp = Blueprint("reports", __name__)


@bp.get("/reports")
def reports_page():
    return render_template("reports.html")


@bp.get("/api/reports")
def api_reports():
    """List the visitor's/user's analyses. Filters: q, model, min_score, max_score."""
    q = Analysis.query
    user = current_user()
    if user:
        q = q.filter(or_(Analysis.user_id == user.id, Analysis.visitor_key == g.visitor_key))
    else:
        q = q.filter(Analysis.visitor_key == g.visitor_key)

    query = (request.args.get("q") or "").strip().lower()
    model = (request.args.get("model") or "").strip()
    min_score = request.args.get("min_score", type=float)
    max_score = request.args.get("max_score", type=float)

    if query:
        like = f"%{query}%"
        q = q.filter(or_(
            Analysis.job_title.ilike(like),
            Analysis.company.ilike(like),
            Analysis.resume_filename.ilike(like),
            Analysis.job_description.ilike(like),
        ))
    if model in ("traditional", "transformer", "compare"):
        q = q.filter(Analysis.model_name == model)
    if min_score is not None:
        q = q.filter(or_(
            Analysis.traditional_score >= min_score,
            Analysis.transformer_score >= min_score,
        ))
    if max_score is not None:
        q = q.filter(or_(
            Analysis.traditional_score <= max_score,
            Analysis.transformer_score <= max_score,
        ))

    rows = q.order_by(Analysis.created_at.desc()).limit(100).all()
    return ok({"reports": [_summary(r) for r in rows], "total": len(rows)})


@bp.delete("/api/reports/<analysis_id>")
def api_report_delete(analysis_id):
    analysis = db.session.get(Analysis, analysis_id)
    if analysis is None:
        return fail("Report not found.", 404)
    if not _owns(analysis):
        return fail("You can only delete your own reports.", 403)

    # remove generated PDF + its record
    report_row = ReportFile.query.filter_by(analysis_id=analysis_id).first()
    if report_row:
        import os
        path = os.path.join(current_app.config["GENERATED_REPORTS_DIR"], report_row.filename)
        if os.path.exists(path):
            os.remove(path)
        db.session.delete(report_row)
    db.session.delete(analysis)
    db.session.commit()
    return ok({"deleted": analysis_id})


@bp.get("/reports/<analysis_id>/download")
def download_report_pdf(analysis_id):
    analysis = db.session.get(Analysis, analysis_id)
    if analysis is None:
        return fail("Report not found.", 404)
    if not _owns(analysis):
        return fail("You can only download your own reports.", 403)

    filename = ensure_report(analysis, current_app.config["GENERATED_REPORTS_DIR"])
    if not ReportFile.query.filter_by(analysis_id=analysis_id).first():
        db.session.add(ReportFile(analysis_id=analysis_id, filename=filename))
        db.session.commit()
    return send_from_directory(current_app.config["GENERATED_REPORTS_DIR"], filename,
                               as_attachment=True, download_name=filename)


def _owns(analysis):
    user = current_user()
    return (analysis.visitor_key == g.visitor_key
            or (user and analysis.user_id == user.id))


def _summary(a):
    return {
        "id": a.id,
        "created_at": a.created_at.isoformat(),
        "job_title": a.job_title,
        "company": a.company,
        "resume_filename": a.resume_filename,
        "model": a.model_name,
        "traditional_score": a.traditional_score,
        "transformer_score": a.transformer_score,
        "matched_count": len(json.loads(a.matched_skills or "[]")),
        "missing_count": len(json.loads(a.missing_skills or "[]")),
    }
