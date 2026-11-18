"""SQLAlchemy models: users, analyses, generated reports, contact messages."""

from datetime import datetime, timezone

from ..extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)

    analyses = db.relationship("Analysis", backref="user", lazy="dynamic")


class Analysis(db.Model):
    __tablename__ = "analyses"

    id = db.Column(db.String(16), primary_key=True)  # unguessable public id
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    visitor_key = db.Column(db.String(64), nullable=False, index=True)

    resume_filename = db.Column(db.String(255), nullable=True)
    resume_text = db.Column(db.Text, nullable=False)
    job_title = db.Column(db.String(200), nullable=True)
    company = db.Column(db.String(200), nullable=True)
    job_description = db.Column(db.Text, nullable=False)

    # 'traditional' | 'transformer' | 'compare'
    model_name = db.Column(db.String(20), nullable=False)

    traditional_score = db.Column(db.Float, nullable=True)
    transformer_score = db.Column(db.Float, nullable=True)

    traditional_time = db.Column(db.Float, nullable=True)   # seconds
    transformer_time = db.Column(db.Float, nullable=True)   # seconds

    matched_skills = db.Column(db.Text, nullable=True)   # JSON list
    missing_skills = db.Column(db.Text, nullable=True)   # JSON list
    results = db.Column(db.Text, nullable=True)          # JSON blob of full payloads

    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class ReportFile(db.Model):
    __tablename__ = "report_files"

    id = db.Column(db.Integer, primary_key=True)
    analysis_id = db.Column(db.String(16), db.ForeignKey("analyses.id"), nullable=False, index=True)
    filename = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(200), nullable=True)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)


class PasswordResetRequest(db.Model):
    __tablename__ = "password_reset_requests"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now, nullable=False)
    handled = db.Column(db.Boolean, default=False, nullable=False)
