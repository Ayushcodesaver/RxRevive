"""Analysis routes: resume upload, NLP analysis endpoints, results page.

Analyses run on the same resume/JD inputs for every model so that the
Traditional and Transformer implementations are always directly comparable.
"""

import json
import secrets

from flask import Blueprint, current_app, g, jsonify, render_template, abort, request
from werkzeug.utils import secure_filename

from ..database.models import Analysis
from ..extensions import db
from ..shared.text_extraction import ExtractionError, extract_text
from ..shared.skill_extractor import identify_skills
from ..traditional_nlp.tfidf_model import analyze_traditional
from ..transformer_nlp.sentence_bert import ModelUnavailableError, analyze_transformer
from .helpers import current_user, fail, ok

bp = Blueprint("analysis", __name__)

SAMPLE_RESUME = """PRIYA SHARMA
Data Scientist | Machine Learning | NLP
Bengaluru, India · priya.sharma@example.com

SUMMARY
Data scientist with 3 years of experience building machine learning and
natural language processing solutions for healthcare and e-commerce products.
Strong background in Python, statistics and end-to-end model deployment.

EXPERIENCE
Data Scientist, MedAnalytics Pvt Ltd (2022 - Present)
- Built NLP models to classify clinical notes, improving triage speed by 30%
- Developed machine learning pipelines with scikit-learn and pandas
- Deployed models as REST APIs using Flask and Docker on AWS
- Created dashboards in Power BI for hospital operations teams
- Collaborated with doctors and product managers to gather requirements

Junior Data Analyst, ShopKart (2020 - 2022)
- Performed exploratory data analysis and A/B testing on customer behaviour
- Cleaned and transformed large transaction datasets with SQL and pandas
- Built predictive models for demand forecasting using regression

SKILLS
Python, SQL, machine learning, deep learning, NLP, natural language
processing, scikit-learn, pandas, numpy, tensorflow, statistics, data
visualization, matplotlib, Power BI, Flask, Docker, AWS, Git, REST APIs,
A/B testing, healthcare domain, communication, teamwork

EDUCATION
B.Tech in Computer Science, VTU Bengaluru (2020)
"""

SAMPLE_JD = """Job Description: Data Scientist (NLP)

Company: HealthTrack Technologies
Location: Bengaluru (Hybrid)

About the role
We are looking for a data scientist to join our NLP team and build
intelligent text analytics for digital health products. You will design,
train and deploy machine learning models that understand medical documents
and patient feedback.

Responsibilities
- Develop NLP and deep learning models for text classification and
  information extraction from clinical documents
- Train, evaluate and fine-tune transformer models
- Build data pipelines for cleaning and processing large text datasets
- Deploy models to production using Docker and AWS
- Present insights to clinical and product stakeholders

Requirements
- 2+ years of experience in data science or machine learning
- Strong Python skills with pandas, numpy and scikit-learn
- Hands-on experience with NLP: natural language processing, text
  classification, embeddings
- Experience with TensorFlow or Pytorch
- Familiarity with Docker, AWS and REST APIs
- Good communication and teamwork; healthcare domain exposure is a plus

Nice to have
- Experience with Kubernetes, Spark, or clinical trials data
- Tableau or Power BI reporting
"""

MODEL_KEYS = {"traditional", "transformer", "compare"}


@bp.get("/analyze")
def analyze_page():
    return render_template("analyze.html")


@bp.get("/api/sample")
def api_sample():
    return jsonify({
        "resume": SAMPLE_RESUME,
        "jd": SAMPLE_JD,
        "job_title": "Data Scientist (NLP)",
        "company": "HealthTrack Technologies",
    })


@bp.post("/api/resume/upload")
def api_resume_upload():
    """Extract and return resume text (in-memory only — nothing is stored)."""
    file = request.files.get("resume_file")
    if file is None or not file.filename:
        return fail("Choose a resume file (PDF, DOCX or TXT).")
    if not _allowed(file.filename):
        return fail("Unsupported file type. Please upload a PDF, DOCX or TXT file.")
    try:
        text = extract_text(file.filename, file.read())
    except ExtractionError as exc:
        return fail(str(exc))
    return ok({
        "filename": secure_filename(file.filename),
        "text": text,
        "preview": text[:1500] + ("…" if len(text) > 1500 else ""),
        "chars": len(text),
    })


@bp.post("/api/analyze/<model_key>")
@bp.post("/api/analyze", defaults={"model_key": None})  # body override: model
def api_analyze(model_key):
    """Run analysis. Accepts multipart form: resume_file OR resume_text, jd_text,
    job_title, company, model. Returns the created analysis id."""
    if model_key is None:
        model_key = request.form.get("model") or (request.get_json(silent=True) or {}).get("model")
    if model_key not in MODEL_KEYS:
        return fail("Unknown model. Choose 'traditional', 'transformer' or 'compare'.")

    # --- inputs -----------------------------------------------------------
    file = request.files.get("resume_file")
    resume_filename = None
    try:
        if file and file.filename:
            if not _allowed(file.filename):
                return fail("Unsupported file type. Please upload a PDF, DOCX or TXT file.")
            resume_text = extract_text(file.filename, file.read())
            resume_filename = secure_filename(file.filename)
        else:
            resume_text = (request.form.get("resume_text") or "").strip()
    except ExtractionError as exc:
        return fail(str(exc))

    jd_text = (request.form.get("jd_text") or "").strip()
    job_title = (request.form.get("job_title") or "").strip()[:200] or None
    company = (request.form.get("company") or "").strip()[:200] or None

    if len(resume_text) < 80:
        return fail("The resume is too short to analyze. Upload or paste a full resume.")
    if len(jd_text) < 80:
        return fail("The job description is too short. Paste the full job posting.")

    # --- shared preprocessing --------------------------------------------
    resume_skills = identify_skills(resume_text)["skills"]
    jd_skills = identify_skills(jd_text)["skills"]

    # --- run engines -------------------------------------------------------
    payload = {}
    error = None
    trad_result = trans_result = None

    if model_key in ("traditional", "compare"):
        trad_result = analyze_traditional(resume_text, jd_text, resume_skills, jd_skills)
        payload["traditional"] = trad_result
    if model_key in ("transformer", "compare"):
        try:
            trans_result = analyze_transformer(resume_text, jd_text, resume_skills, jd_skills)
            payload["transformer"] = trans_result
        except ModelUnavailableError as exc:
            error = str(exc)
            if model_key == "transformer":
                return fail(error, 503)
    if error:
        payload["error_note"] = error

    primary = trans_result or trad_result

    # --- persist -----------------------------------------------------------
    analysis = Analysis(
        id=secrets.token_hex(6),
        user_id=current_user().id if current_user() else None,
        visitor_key=g.visitor_key,
        resume_filename=resume_filename,
        resume_text=resume_text,
        job_title=job_title,
        company=company,
        job_description=jd_text,
        model_name=model_key,
        traditional_score=trad_result["match_percentage"] if trad_result else None,
        transformer_score=trans_result["match_percentage"] if trans_result else None,
        traditional_time=trad_result["processing_time"] if trad_result else None,
        transformer_time=trans_result["processing_time"] if trans_result else None,
        matched_skills=json.dumps(primary["matched_skills"]),
        missing_skills=json.dumps(primary["missing_skills"]),
        results=json.dumps(payload),
    )
    db.session.add(analysis)
    db.session.commit()

    return ok({"id": analysis.id, "model": model_key}, 201)


@bp.get("/results/<analysis_id>")
def results_page(analysis_id):
    analysis = _get_analysis_or_404(analysis_id)
    payload = json.loads(analysis.results) if analysis.results else {}
    return render_template("results.html", analysis=analysis, payload=payload,
                           matched=json.loads(analysis.matched_skills or "[]"),
                           missing=json.loads(analysis.missing_skills or "[]"))


@bp.get("/api/reports/<analysis_id>")
def api_analysis_detail(analysis_id):
    analysis = _get_analysis_or_404(analysis_id)
    payload = json.loads(analysis.results) if analysis.results else {}
    return ok(_serialize(analysis, payload))


def _get_analysis_or_404(analysis_id):
    analysis = db.session.get(Analysis, analysis_id)
    if analysis is None:
        abort(404)
    return analysis


def _allowed(filename):
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


def _serialize(analysis, payload):
    return {
        "id": analysis.id,
        "created_at": analysis.created_at.isoformat(),
        "resume_filename": analysis.resume_filename,
        "job_title": analysis.job_title,
        "company": analysis.company,
        "model": analysis.model_name,
        "traditional_score": analysis.traditional_score,
        "transformer_score": analysis.transformer_score,
        "traditional_time": analysis.traditional_time,
        "transformer_time": analysis.transformer_time,
        "matched_skills": json.loads(analysis.matched_skills or "[]"),
        "missing_skills": json.loads(analysis.missing_skills or "[]"),
        "payload": payload,
    }
