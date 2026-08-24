import logging
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

try:
    import redis
except ImportError:
    redis = None

from ..database import SessionLocal
from ..models.user import User

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be configured with a strong secret of at least 32 characters.")

ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").upper()
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
# Argon2id is used for all newly stored passwords. The legacy scheme remains
# readable temporarily so existing accounts can migrate on password change.
pwd_context = CryptContext(schemes=["argon2", "sha256_crypt"], deprecated=["sha256_crypt"])

# Kept so FastAPI's interactive docs still offer a bearer-token "Authorize"
# button; actual token extraction below checks the cookie first (see
# get_current_user) and does not require this scheme to be satisfied.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# The web frontend authenticates via an httpOnly cookie (immune to XSS-based
# token theft, unlike sessionStorage/localStorage); the separate Expo/React
# Native mobile app (mobile/src/services/auth.ts) has no reliable browser
# cookie jar, so it keeps using a Bearer token in the Authorization header.
# get_current_user below accepts either. Because the auth cookie crosses
# origins (frontend and backend are deployed on different domains), it must
# be SameSite=None, which means it IS sent on cross-site requests — the CSRF
# double-submit check in main.py is what keeps that safe for cookie-based
# requests specifically.
ACCESS_TOKEN_COOKIE_NAME = "mbaara_access_token"
CSRF_COOKIE_NAME = "mbaara_csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"


def _parse_bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _is_development_env() -> bool:
    return any(
        os.getenv(name, "").strip().lower() == "development"
        for name in ["FASTAPI_ENV", "ENV", "NODE_ENV"]
    ) or os.getenv("DEV", "").strip().lower() in {"1", "true", "yes", "on"}

ACCESS_TOKEN_COOKIE_SECURE = _parse_bool_env("ACCESS_TOKEN_COOKIE_SECURE", not _is_development_env())
CSRF_COOKIE_SECURE = _parse_bool_env("CSRF_COOKIE_SECURE", ACCESS_TOKEN_COOKIE_SECURE)
ACCESS_TOKEN_COOKIE_SAMESITE = os.getenv("ACCESS_TOKEN_COOKIE_SAMESITE", "none")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "none")


def set_auth_cookies(response: Response, token: str, remember: bool = False) -> None:
    max_age = (REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60) if remember else (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    secure = ACCESS_TOKEN_COOKIE_SECURE
    if _is_development_env():
        secure = False

    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite="none",
        path="/",
    )
    # Deliberately NOT httponly: the frontend reads this value and echoes it
    # back as the X-CSRF-Token header on mutating requests (double-submit
    # pattern). A cross-site attacker can make the browser send the auth
    # cookie automatically, but cannot read this cookie's value to forge
    # the matching header, since same-origin policy blocks that read.
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=secrets.token_urlsafe(32),
        max_age=max_age,
        httponly=False,
        secure=secure,
        samesite="none",
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    secure = ACCESS_TOKEN_COOKIE_SECURE
    if _is_development_env():
        secure = False
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE_NAME, path="/", samesite="none", secure=secure)
    response.delete_cookie(key=CSRF_COOKIE_NAME, path="/", samesite="none", secure=secure)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def password_needs_rehash(hashed_password: str) -> bool:
    return pwd_context.needs_update(hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from exc


def _load_admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    if not raw:
        return set()
    return {email.strip().lower() for email in raw.replace(";", ",").split(",") if email.strip()}

ADMIN_EMAILS = _load_admin_emails()


def is_admin_email(email: str | None) -> bool:
    return bool(email and email.strip().lower() in ADMIN_EMAILS)


def _extract_token(request: Request, header_token: str | None) -> str | None:
    cookie_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    return header_token


def get_current_user(request: Request, header_token: str | None = Depends(oauth2_scheme)) -> User:
    token = _extract_token(request, header_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    finally:
        db.close()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not getattr(user, "email_verified", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    if getattr(user, "role", None) is None:
        setattr(user, "role", "user")
    return user


def get_current_user_optional(request: Request, header_token: str | None = Depends(oauth2_scheme)) -> User | None:
    try:
        return get_current_user(request, header_token)
    except HTTPException as exc:
        if exc.status_code in {401, 403}:
            return None
        raise


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return current_user


class RateLimiter:
    """Per-process, per-client-IP sliding-window rate limiter.

    Note: state is in-memory, so limits reset on restart and are not shared
    across multiple worker processes/instances. Acceptable for the current
    single-instance deployment; move to a shared store (e.g. Redis) if the
    backend is scaled horizontally.
    """

    def __init__(self, max_attempts: int, window_seconds: int, name: str = "default"):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.name = name
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._redis = None
        redis_url = os.getenv("REDIS_URL")
        if redis is not None and redis_url:
            self._redis = redis.Redis.from_url(redis_url, decode_responses=True)

    def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        if self._redis is not None:
            key = f"mbaara:rate:{self.name}:{client_ip}"
            try:
                attempts = self._redis.incr(key)
                if attempts == 1:
                    self._redis.expire(key, self.window_seconds)
                if attempts > self.max_attempts:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="Too many requests. Please retry later.",
                    )
                return
            except HTTPException:
                raise
            except Exception:
                logger.warning("Redis rate limiter unavailable; using local fallback", exc_info=True)
        now = time.monotonic()
        bucket = self._buckets[client_ip]
        while bucket and now - bucket[0] > self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please retry later.",
            )
        bucket.append(now)
