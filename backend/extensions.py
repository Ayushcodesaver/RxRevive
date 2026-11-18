"""Shared Flask extensions (single instances, bound in create_app)."""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
