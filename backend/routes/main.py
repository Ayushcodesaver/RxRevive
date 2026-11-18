"""Public content pages: home, about, features, how-it-works, traditional,
transformer, dataset, comparison, architecture, contact."""

import csv
import os

from flask import Blueprint, current_app, jsonify, render_template, request

from ..database.models import ContactMessage
from ..extensions import db
from ..transformer_nlp.sentence_bert import model_status as sbert_status
from .helpers import fail, ok, valid_email

bp = Blueprint("main", __name__)

DATASET_OPTIONS = [
    {
        "name": "Resume-Job Fit Dataset",
        "size_label": "~93,733 examples",
        "format": "CSV / Hugging Face dataset",
        "features": "Resume text, job description, fit label (Good Fit / Potential Fit / No Fit)",
        "splits": "Training and testing splits provided",
        "role": "Primary dataset — label-supervised evaluation of both engines",
        "link": None,  # verified source link intentionally left blank; add after verification
    },
    {
        "name": "Resume-JD Matching Dataset",
        "size_label": "~29,040 pairs (synthetic)",
        "format": "CSV",
        "features": "1,320 resumes, 1,320 job descriptions, positive/negative matching labels",
        "splits": "Single split — construct your own train/test split",
        "role": "Alternative for pair-matching experiments",
        "link": None,
    },
    {
        "name": "Resume and Job Description Matching Dataset",
        "size_label": "~1,031 samples",
        "format": "CSV",
        "features": "Matched and mismatched resumes, matching scores, skill alignment information",
        "splits": "Single split — construct your own train/test split",
        "role": "Small-scale sanity checks and manual inspection",
        "link": None,
    },
    {
        "name": "Role Radar Dataset (India-focused)",
        "size_label": "~22,465 profile-job pairs",
        "format": "CSV",
        "features": "2,500 Indian job postings, 640 candidate profiles, skills/experience/domain match scores",
        "splits": "Single split — construct your own train/test split",
        "role": "Regional (India) generalisation testing",
        "link": None,
    },
]


def _register_pages():
    pages = [
        ("/", "index.html"),
        ("/about", "about.html"),
        ("/features", "features.html"),
        ("/how-it-works", "how_it_works.html"),
        ("/traditional", "traditional.html"),
        ("/transformer", "transformer.html"),
        ("/dataset", "dataset.html"),
        ("/comparison", "comparison.html"),
        ("/architecture", "architecture.html"),
        ("/contact", "contact.html"),
    ]
    for route, template in pages:
        endpoint = template.split(".")[0] if route else "index"
        bp.add_url_rule(route, endpoint, lambda t=template: render_template(t))


_register_pages()


@bp.get("/api/health")
def api_health():
    sbert_state, sbert_message = sbert_status()
    return jsonify({
        "status": "healthy",
        "database": "connected",
        "traditional_engine": "ready",
        "transformer_engine": sbert_state,
        "transformer_message": sbert_message,
    })


@bp.post("/api/contact")
def api_contact():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if len(name) < 2:
        return fail("Please enter your name.")
    if not valid_email(email):
        return fail("Please enter a valid email address.")
    if len(message) < 10:
        return fail("Please write a message of at least 10 characters.")

    db.session.add(ContactMessage(name=name, email=email,
                                  subject=subject or "Feedback", message=message))
    db.session.commit()
    return ok({"message": "Thank you — your message has been received by the RxRevive team."})


@bp.post("/api/dataset/upload")
def api_dataset_upload():
    """Upload a CSV dataset for authorized research experiments (stored locally)."""
    file = request.files.get("dataset_file")
    if file is None or not file.filename:
        return fail("Choose a CSV file to upload.")
    filename = os.path.basename(file.filename)
    if not filename.lower().endswith(".csv"):
        return fail("Only .csv files are accepted for dataset experiments.")
    data = file.read()
    if not data:
        return fail("The uploaded file is empty.")
    if len(data) > current_app.config["MAX_CONTENT_LENGTH"]:
        return fail("The file exceeds the 8 MB upload limit.")

    # Parse a sample to validate the CSV and read its structure
    try:
        decoded = data.decode("utf-8", errors="replace")
        reader = csv.reader(decoded.splitlines())
        header = next(reader)
        row_count = sum(1 for _ in reader)
    except Exception as exc:
        return fail(f"Could not parse the CSV file: {exc}")

    datasets_dir = current_app.config["DATASETS_DIR"]
    os.makedirs(datasets_dir, exist_ok=True)
    safe_name = filename.replace(" ", "_")
    with open(os.path.join(datasets_dir, safe_name), "wb") as fh:
        fh.write(data)

    return ok({
        "message": f"Dataset '{safe_name}' stored for research experiments.",
        "columns": header[:30],
        "rows": row_count,
        "note": "Label-supervised evaluation (precision, recall, F1) is not configured yet — "
                "connect a labelled dataset in Phase 6 to enable it.",
    })
