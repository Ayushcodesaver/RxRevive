"""Application configuration."""

import os
import secrets

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _secret_key():
    """Persisted random secret key (generated on first run)."""
    key_file = os.path.join(BASE_DIR, ".secret_key")
    if os.path.exists(key_file):
        with open(key_file, "r", encoding="utf-8") as fh:
            key = fh.read().strip()
            if key:
                return key
    key = secrets.token_hex(32)
    with open(key_file, "w", encoding="utf-8") as fh:
        fh.write(key)
    return key


class Config:
    SECRET_KEY = _secret_key()
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8 MB upload limit

    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "rxrevive.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Storage folders
    UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
    GENERATED_REPORTS_DIR = os.path.join(BASE_DIR, "generated_reports")
    DATASETS_DIR = os.path.join(BASE_DIR, "datasets")

    # Upload security
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
    ALLOWED_DATASET_EXTENSIONS = {".csv"}

    # Transformer model
    SBERT_MODEL_NAME = "all-MiniLM-L6-v2"
