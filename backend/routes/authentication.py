"""Authentication routes: pages + JSON API (register, login, logout, forgot password)."""

from flask import Blueprint, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from ..database.models import PasswordResetRequest, User
from ..extensions import db
from .helpers import SESSION_USER, fail, ok, valid_email

bp = Blueprint("auth", __name__)


@bp.get("/login")
def login_page():
    if session.get(SESSION_USER):
        return redirect(url_for("dashboard.dashboard_page"))
    return render_template("login.html")


@bp.get("/register")
def register_page():
    if session.get(SESSION_USER):
        return redirect(url_for("dashboard.dashboard_page"))
    return render_template("register.html")


@bp.get("/forgot-password")
def forgot_password_page():
    return render_template("forgot_password.html")


@bp.post("/api/auth/register")
def api_register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if len(name) < 2:
        return fail("Please enter your full name.")
    if not valid_email(email):
        return fail("Please enter a valid email address.")
    if len(password) < 8:
        return fail("Password must be at least 8 characters long.")
    if not any(c.isdigit() for c in password) or not any(c.isalpha() for c in password):
        return fail("Password must contain both letters and numbers.")

    if User.query.filter_by(email=email).first():
        return fail("An account with this email already exists. Try logging in.", 409)

    user = User(name=name, email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    session[SESSION_USER] = user.id
    session.permanent = True
    return ok({"user": {"id": user.id, "name": user.name, "email": user.email}}, 201)


@bp.post("/api/auth/login")
def api_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not valid_email(email):
        return fail("Please enter a valid email address.")
    if not password:
        return fail("Please enter your password.")

    user = User.query.filter_by(email=email).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return fail("Invalid email or password.", 401)

    session[SESSION_USER] = user.id
    session.permanent = True
    return ok({"user": {"id": user.id, "name": user.name, "email": user.email}})


@bp.post("/api/auth/logout")
def api_logout():
    session.pop(SESSION_USER, None)
    return ok({"logged_out": True})


@bp.post("/api/auth/forgot-password")
def api_forgot_password():
    """Academic demo: the request is recorded; email delivery is not configured."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not valid_email(email):
        return fail("Please enter a valid email address.")
    db.session.add(PasswordResetRequest(email=email))
    db.session.commit()
    return ok({
        "message": "Your reset request has been recorded. Password reset emails are not "
                   "configured in this academic demo; contact the RxRevive team to reset your password."
    })
