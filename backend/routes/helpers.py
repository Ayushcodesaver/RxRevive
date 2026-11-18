"""Route helpers: visitor identity, auth session utilities, JSON responses."""

import re
import secrets
from functools import wraps

from flask import g, jsonify, request, session

from ..database.models import User

VISITOR_KEY = "rvk"
SESSION_USER = "uid"


def ensure_visitor_key():
    """Give every visitor a stable anonymous id so guest analyses persist."""
    if VISITOR_KEY not in session:
        session[VISITOR_KEY] = secrets.token_hex(16)
    g.visitor_key = session[VISITOR_KEY]


def current_user():
    uid = session.get(SESSION_USER)
    if uid is None:
        return None
    user = db_get_user(uid)
    if user is None:  # stale session
        session.pop(SESSION_USER, None)
    return user


def db_get_user(uid):
    from ..extensions import db
    from ..database.models import User as U
    return db.session.get(U, uid)


def login_user(user):
    session[SESSION_USER] = user.id
    session.permanent = True


def logout_user():
    session.pop(SESSION_USER, None)


def login_required_api(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            return jsonify({"error": "Please log in to continue."}), 401
        return fn(*args, **kwargs)
    return wrapper


def ok(data, status=200):
    return jsonify(data), status


def fail(message, status=400, **extra):
    body = {"error": message}
    body.update(extra)
    return jsonify(body), status


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")


def valid_email(email):
    return bool(EMAIL_RE.match(email or ""))


def owned_analysis(query):
    """Restrict an Analysis query to records belonging to this visitor/user."""
    user = current_user()
    if user:
        return query.filter((Analysis.user_id == user.id) | (Analysis.visitor_key == g.visitor_key))
    from ..database.models import Analysis
    return query.filter(Analysis.visitor_key == g.visitor_key)


from ..database.models import Analysis  # noqa: E402  (used in owned_analysis)
