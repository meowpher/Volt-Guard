import os
import hashlib
import time
from functools import wraps
from typing import Optional
import jwt
from flask import request, jsonify

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
JWT_TTL = 60 * 60 * 24 * 7  # 7 days


def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


def verify_password(pw: str, h: str) -> bool:
    return hash_password(pw) == h


def create_token(user_id: int, email: str) -> str:
    payload = {"sub": user_id, "email": email, "iat": int(time.time()), "exp": int(time.time()) + JWT_TTL}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"ok": False, "error": "missing_bearer_token"}), 401
        token = auth.split(" ", 1)[1]
        claims = decode_token(token)
        if not claims:
            return jsonify({"ok": False, "error": "invalid_token"}), 401
        request.user = {"id": claims.get("sub"), "email": claims.get("email")}
        return fn(*args, **kwargs)
    return wrapper
