"""RxRevive Flask application factory."""

import os

from flask import Flask, jsonify, render_template, request

from .config import Config
from .extensions import db
from .routes.helpers import ensure_visitor_key


def create_app(config_class=Config):
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "templates"),
        static_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "static"),
        static_url_path="/static",
    )
    app.config.from_object(config_class)

    # Storage folders
    for folder in (app.config["UPLOADS_DIR"], app.config["GENERATED_REPORTS_DIR"], app.config["DATASETS_DIR"]):
        os.makedirs(folder, exist_ok=True)

    # Extensions
    db.init_app(app)

    # Security headers for sessions
    app.config.setdefault("SESSION_COOKIE_HTTPONLY", True)
    app.config.setdefault("SESSION_COOKIE_SAMESITE", "Lax")

    # Visitor identity (guest analyses)
    @app.before_request
    def before_any_request():
        ensure_visitor_key()

    # Template globals
    from .transformer_nlp.sentence_bert import model_status as sbert_status

    @app.context_processor
    def inject_globals():
        state, message = sbert_status()
        user = None
        from .routes.helpers import current_user
        user = current_user()
        return {
            "sbert_state": state,
            "sbert_message": message,
            "current_user": user,
        }

    @app.errorhandler(404)
    def not_found(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Endpoint not found."}), 404
        return render_template("404.html"), 404

    @app.errorhandler(413)
    def too_large(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "The uploaded file exceeds the 8 MB limit."}), 413
        return render_template("404.html", message="The uploaded file exceeds the 8 MB limit."), 413

    @app.errorhandler(500)
    def server_error(error):
        if request.path.startswith("/api/"):
            return jsonify({"error": "Internal server error. Please try again."}), 500
        return render_template("404.html", message="Something went wrong on our side. Please try again."), 500

    # Blueprints
    from .routes import analysis, authentication, dashboard, main, reports
    app.register_blueprint(main.bp)
    app.register_blueprint(authentication.bp)
    app.register_blueprint(analysis.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(dashboard.bp)

    # Database tables
    with app.app_context():
        db.create_all()

    return app
