import hashlib
import os
import re
import secrets
import smtplib
import time
import uuid
from collections import defaultdict, deque
from datetime import timedelta
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, Depends, Request, Response, status, Form, UploadFile, File
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import httpx
from ..database import get_db
from ..models.user import User
from ..services import security
from ..services.security import RateLimiter, get_current_user, is_admin_email

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", os.getenv("SUPABASE_URL"))
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", os.getenv("SUPABASE_ANON_KEY"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://m-baara-langues.web.app").rstrip("/")
PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
PROFILE_IMAGE_SIGNATURES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),
}

router = APIRouter()

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_ATTEMPTS = 5
LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60
LOGIN_FAILURE_MAX_ATTEMPTS = 5
_login_failure_buckets: dict[str, deque[float]] = defaultdict(deque)
_auth_rate_limiter = RateLimiter(name="auth", max_attempts=RATE_LIMIT_MAX_ATTEMPTS, window_seconds=RATE_LIMIT_WINDOW_SECONDS)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _check_rate_limit(request: Request) -> None:
    _auth_rate_limiter(request)


def _auth_response(request: Request, user: User, token: str) -> dict:
    result = {"user": {"id": user.id, "email": user.email, "full_name": user.full_name, "photo_url": user.photo_url, "role": user.role}}
    if request.headers.get("x-client-platform", "").strip().lower() == "mobile":
        result.update({"access_token": token, "token_type": "bearer"})
    return result


def _record_login_failure(email: str) -> None:
    key = _normalize_email(email)
    now = time.monotonic()
    bucket = _login_failure_buckets[key]
    while bucket and now - bucket[0] > LOGIN_FAILURE_WINDOW_SECONDS:
        bucket.popleft()
    bucket.append(now)
    if len(bucket) >= LOGIN_FAILURE_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please retry later.",
        )


def _clear_login_failures(email: str) -> None:
    _login_failure_buckets.pop(_normalize_email(email), None)


def _authenticate_supabase_password(email: str, password: str, db: Session):
    """Authenticate a Supabase Auth account and mirror it into M'baara."""
    api_key = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY
    if not SUPABASE_URL or not api_key:
        return None

    try:
        response = httpx.post(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/token",
            params={"grant_type": "password"},
            headers={"apikey": api_key, "Content-Type": "application/json"},
            json={"email": email, "password": password},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")

    if response.status_code in {400, 401}:
        return None
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    if response.is_error:
        return None

    payload = response.json()
    supabase_user = payload.get("user") or {}
    verified = bool(supabase_user.get("email_confirmed_at"))
    user_email = _normalize_email(supabase_user.get("email") or email)
    metadata = supabase_user.get("user_metadata") or {}
    user = db.query(User).filter(User.email == user_email).first()

    if not user:
        user = User(
            email=user_email,
            hashed_password=security.get_password_hash(uuid.uuid4().hex),
            full_name=metadata.get("full_name") or metadata.get("name"),
            photo_url=metadata.get("avatar_url") or metadata.get("picture"),
            role="admin" if is_admin_email(user_email) else "user",
            email_verified=verified,
        )
        db.add(user)
    else:
        user.email_verified = verified
        if not user.full_name and (metadata.get("full_name") or metadata.get("name")):
            user.full_name = metadata.get("full_name") or metadata.get("name")
        if is_admin_email(user_email):
            user.role = "admin"

    db.commit()
    db.refresh(user)
    return user


def _register_supabase_password(email: str, password: str, full_name: str | None, db: Session):
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        response = httpx.post(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/signup",
            headers={"apikey": SUPABASE_SERVICE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": password, "data": {"full_name": full_name} if full_name else {}},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    if response.status_code in {400, 422}:
        try:
            error_message = str(response.json().get("msg") or response.json().get("message") or "").lower()
        except ValueError:
            error_message = ""
        if "already" in error_message or "registered" in error_message or "exists" in error_message:
            raise HTTPException(status_code=409, detail="Cette adresse e-mail est déjà utilisée. Connectez-vous ou réinitialisez votre mot de passe.")
        raise HTTPException(status_code=400, detail="Impossible de créer ce compte. Vérifiez l'adresse e-mail et réessayez.")
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    if response.is_error:
        raise HTTPException(status_code=400, detail="Impossible de créer ce compte.")

    payload = response.json()
    supabase_user = payload.get("user") or payload
    user_email = _normalize_email(supabase_user.get("email") or email)
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        user = User(
            email=user_email,
            hashed_password=security.get_password_hash(uuid.uuid4().hex),
            full_name=full_name,
            role="admin" if is_admin_email(user_email) else "user",
            email_verified=bool(supabase_user.get("email_confirmed_at")),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return {"verification_required": not user.email_verified, "user": {"id": user.id, "email": user.email, "full_name": user.full_name}}


def _change_supabase_password(email: str, current_password: str, new_password: str) -> bool:
    """Verify the current Supabase password and update it server-side."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return False
    try:
        response = httpx.post(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/token",
            params={"grant_type": "password"},
            headers={"apikey": SUPABASE_SERVICE_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": current_password},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")

    if response.status_code in {400, 401}:
        return False
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    if response.is_error:
        return False

    supabase_user = response.json().get("user") or {}
    user_id = supabase_user.get("id")
    if not user_id:
        return False
    try:
        update_response = httpx.put(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
            },
            json={"password": new_password},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    if update_response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Le service d'authentification est momentanément indisponible.")
    return True


def _validate_password_strength(password: str) -> str:
    if len(password) < 12 or len(password) > 128:
        raise ValueError("Password must be between 12 and 128 characters long")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password must contain at least one special character")
    return password


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    remember: bool = False


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordConfirmRequest(BaseModel):
    resetToken: str
    newPassword: str = Field(..., min_length=12, max_length=128)

    @field_validator("newPassword")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return _validate_password_strength(value)


class VerifyEmailRequest(BaseModel):
    resetToken: str


class UpdateMeRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    photo_url: str | None = None
    current_password: str | None = Field(default=None, min_length=1, max_length=128)
    new_password: str | None = Field(default=None, min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str | None) -> str | None:
        return _validate_password_strength(value) if value is not None else None


reset_tokens: dict[str, tuple[int, float]] = {}


def _is_valid_email_address(email: str) -> bool:
    return bool(re.match(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$", email.strip()))


def _send_verification_email(user: User) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_host or not smtp_user or not smtp_password:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Le service d'envoi d'e-mails n'est pas configuré.")

    token = security.create_access_token(
        {"sub": str(user.id), "email": user.email, "purpose": "email_verification"},
        expires_delta=timedelta(minutes=15),
    )
    message = EmailMessage()
    message["Subject"] = "Confirme ton adresse e-mail - M'baara Langues"
    message["From"] = os.getenv("SMTP_FROM", smtp_user)
    message["To"] = user.email
    message.set_content(
        "Bienvenue sur M'baara Langues !\n\n"
        "Confirme ton adresse e-mail dans les 15 minutes :\n"
        f"{FRONTEND_URL}/verify-email?token={token}\n\n"
        "Si tu n'es pas à l'origine de cette inscription, ignore ce message."
    )
    try:
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587")), timeout=15) as smtp:
            smtp.starttls()
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Impossible d'envoyer l'e-mail de vérification.") from exc


def _send_password_reset_email(user: User, token: str) -> None:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_host or not smtp_user or not smtp_password:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Le service d'envoi d'e-mails n'est pas configuré.")

    message = EmailMessage()
    message["Subject"] = "Réinitialise ton mot de passe - M'baara Langues"
    message["From"] = os.getenv("SMTP_FROM", smtp_user)
    message["To"] = user.email
    message.set_content(
        "Tu as demandé à réinitialiser ton mot de passe M'baara Langues.\n\n"
        "Utilise ce lien dans les 15 minutes :\n"
        f"{FRONTEND_URL}/reset-password?token={token}\n\n"
        "Si tu n'es pas à l'origine de cette demande, ignore ce message."
    )
    try:
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587")), timeout=15) as smtp:
            smtp.starttls()
            smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Impossible d'envoyer l'e-mail de réinitialisation.") from exc


def _smtp_is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"))


def _should_auto_verify_when_smtp_unavailable() -> bool:
    return os.getenv("AUTO_VERIFY_ON_MISSING_SMTP", "false").strip().lower() in {"1", "true", "yes"}


def _verify_supabase_access_token(access_token: str) -> dict:
    """
    Verify a Supabase access token by calling the Supabase auth user endpoint.
    Returns a dict with keys: email, name, picture, supabase_id, email_verified
    """
    if not SUPABASE_URL:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Supabase URL is not configured on the backend.")
    try:
        url = SUPABASE_URL.rstrip("/") + "/auth/v1/user"
        # Include the Supabase service key as `apikey` header to allow server-side
        # verification of access tokens (avoids client CORS/auth restrictions).
        headers = {"Authorization": f"Bearer {access_token}"}
        if SUPABASE_SERVICE_KEY:
            headers["apikey"] = SUPABASE_SERVICE_KEY
        resp = httpx.get(url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        payload = resp.json()
        # payload structure: { "id": ..., "aud": ..., "role": ..., "email": ..., "email_confirmed_at": ..., "user_metadata": {...} }
        email = payload.get("email")
        name = None
        picture = None
        user_metadata = payload.get("user_metadata") or {}
        if isinstance(user_metadata, dict):
            name = user_metadata.get("full_name") or user_metadata.get("name")
            picture = user_metadata.get("avatar_url") or user_metadata.get("picture")
        return {
            "email": email,
            "name": name,
            "picture": picture,
            "supabase_id": payload.get("id"),
            "email_verified": bool(payload.get("email_confirmed_at")),
        }
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton Supabase invalide.")


class SupabaseAuthRequest(BaseModel):
    access_token: str


@router.post("/supabase")
def supabase_auth(request: Request, payload: SupabaseAuthRequest, response: Response, db: Session = Depends(get_db)):
    token_payload = _verify_supabase_access_token(payload.access_token)
    email = token_payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'email Supabase est requis.")
    if not _is_valid_email_address(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Adresse e-mail invalide.")

    user = db.query(User).filter(User.email == email).first()
    supabase_email_verified = bool(token_payload.get("email_verified", False))
    if not user:
        role = "admin" if is_admin_email(email) else "user"
        user = User(
            email=email,
            hashed_password=security.get_password_hash(uuid.uuid4().hex),
            full_name=token_payload.get("name"),
            photo_url=token_payload.get("picture"),
            role=role,
            email_verified=supabase_email_verified,
        )
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == email).first()
            if not user:
                raise
    else:
        updated = False
        if is_admin_email(email) and user.role != "admin":
            user.role = "admin"
            updated = True
        if not user.full_name and token_payload.get("name"):
            user.full_name = token_payload.get("name")
            updated = True
        if not user.photo_url and token_payload.get("picture"):
            user.photo_url = token_payload.get("picture")
            updated = True
        if user.email_verified is not supabase_email_verified:
            user.email_verified = supabase_email_verified
            updated = True
        if updated:
            db.add(user)
            db.commit()
            db.refresh(user)

    token = security.create_access_token({"sub": str(user.id), "email": user.email})
    security.set_auth_cookies(response, token)
    return _auth_response(request, user, token)


@router.post("/supabase/form")
def supabase_auth_form(request: Request, access_token: str = Form(...), response: Response = None, db: Session = Depends(get_db)):
    """
    Form-based Supabase auth endpoint: accepts application/x-www-form-urlencoded
    with access_token field. Useful as a fallback when XHR CORS fails.
    """
    if response is None:
        response = Response()

    token_payload = _verify_supabase_access_token(access_token)
    email = token_payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'email Supabase est requis.")
    if not _is_valid_email_address(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Adresse e-mail invalide.")

    user = db.query(User).filter(User.email == email).first()
    supabase_email_verified = bool(token_payload.get("email_verified", False))
    if not user:
        role = "admin" if is_admin_email(email) else "user"
        user = User(
            email=email,
            hashed_password=security.get_password_hash(uuid.uuid4().hex),
            full_name=token_payload.get("name"),
            photo_url=token_payload.get("picture"),
            role=role,
            email_verified=supabase_email_verified,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        updated = False
        if is_admin_email(email) and user.role != "admin":
            user.role = "admin"
            updated = True
        if not user.full_name and token_payload.get("name"):
            user.full_name = token_payload.get("name")
            updated = True
        if not user.photo_url and token_payload.get("picture"):
            user.photo_url = token_payload.get("picture")
            updated = True
        if user.email_verified is not supabase_email_verified:
            user.email_verified = supabase_email_verified
            updated = True
        if updated:
            db.add(user)
            db.commit()
            db.refresh(user)

    token = security.create_access_token({"sub": str(user.id), "email": user.email})
    security.set_auth_cookies(response, token)
    return _auth_response(request, user, token)


@router.post("/verify-email-request")
def request_email_verification(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    email = _normalize_email(payload.email)
    if not _is_valid_email_address(email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Adresse e-mail invalide.")
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        try:
            resend_response = httpx.post(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/resend",
                headers={"apikey": SUPABASE_SERVICE_KEY, "Content-Type": "application/json"},
                json={"type": "signup", "email": email},
                timeout=10.0,
            )
            if resend_response.status_code < 500:
                return {"status": "ok", "message": "Si ce compte existe et n'est pas confirmé, un e-mail de confirmation a été envoyé."}
        except httpx.HTTPError:
            pass
    user = db.query(User).filter(User.email == email).first()
    if user:
        if _smtp_is_configured():
            _send_verification_email(user)
        elif _should_auto_verify_when_smtp_unavailable():
            return {
                "status": "ok",
                "message": "Le service d'e-mail n'est pas configuré. Votre compte peut être utilisé immédiatement si l'auto-vérification est activée.",
            }
        else:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Le service d'envoi d'e-mails n'est pas configuré.")
    return {"status": "ok", "message": "Si ce compte existe, un e-mail de vérification a été envoyé."}


@router.post("/verify-email")
def verify_email(request: Request, payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    try:
        token_data = security.decode_access_token(payload.resetToken)
    except HTTPException as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien de vérification invalide ou expiré.") from exc
    if token_data.get("purpose") != "email_verification" or not token_data.get("sub"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lien de vérification invalide.")
    user = db.query(User).filter(User.id == int(token_data["sub"]), User.email == token_data.get("email")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.email_verified = True
    db.add(user)
    db.commit()
    return {"status": "ok", "email_verified": True}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: Request, response: Response, payload: RegisterRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    normalized_email = _normalize_email(payload.email)
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if not _is_valid_email_address(normalized_email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Adresse e-mail invalide.")

    supabase_result = _register_supabase_password(normalized_email, payload.password, payload.full_name, db)
    if supabase_result is not None:
        supabase_result["message"] = "Compte créé. Consultez votre boîte mail et confirmez votre adresse avant de vous connecter."
        return supabase_result

    auto_verified = False
    email_verified = False
    if not _smtp_is_configured() and _should_auto_verify_when_smtp_unavailable():
        auto_verified = True
        email_verified = True

    user = User(
        email=normalized_email,
        hashed_password=security.get_password_hash(payload.password),
        full_name=payload.full_name,
        role="user",
        email_verified=email_verified,
    )
    db.add(user)
    db.flush()
    if not auto_verified:
        try:
            _send_verification_email(user)
        except HTTPException:
            db.rollback()
            raise
    db.commit()

    response = {
        "verification_required": not auto_verified,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }
    if auto_verified:
        response["message"] = (
            "Le service d'e-mail n'est pas configuré. Ton adresse est automatiquement vérifiée pour permettre la connexion."
        )
    return response


@router.post("/register/form", status_code=status.HTTP_201_CREATED)
def register_form(
    request: Request,
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    full_name: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """
    Form-based registration endpoint for application/x-www-form-urlencoded.
    Useful as a fallback when XHR/CORS fails.
    """
    _check_rate_limit(request)
    try:
        password = _validate_password_strength(password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    if full_name and len(full_name) > 120:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Full name is too long.")
    normalized_email = _normalize_email(email)
    existing = db.query(User).filter(User.email == normalized_email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if not _is_valid_email_address(normalized_email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Adresse e-mail invalide.")

    supabase_result = _register_supabase_password(normalized_email, password, full_name, db)
    if supabase_result is not None:
        supabase_result["message"] = "Compte créé. Consultez votre boîte mail et confirmez votre adresse avant de vous connecter."
        return supabase_result

    auto_verified = False
    email_verified = False
    if not _smtp_is_configured() and _should_auto_verify_when_smtp_unavailable():
        auto_verified = True
        email_verified = True

    user = User(
        email=normalized_email,
        hashed_password=security.get_password_hash(password),
        full_name=full_name,
        role="user",
        email_verified=email_verified,
    )
    db.add(user)
    db.flush()
    if not auto_verified:
        try:
            _send_verification_email(user)
        except HTTPException:
            db.rollback()
            raise
    db.commit()

    response = {
        "verification_required": not auto_verified,
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name},
    }
    if auto_verified:
        response["message"] = (
            "Le service d'e-mail n'est pas configuré. Ton adresse est automatiquement vérifiée pour permettre la connexion."
        )
    return response


@router.post("/login")
def login(request: Request, response: Response, payload: LoginRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    normalized_email = _normalize_email(payload.email)

    user = db.query(User).filter(User.email == normalized_email).first()
    local_password_valid = bool(user and security.verify_password(payload.password, user.hashed_password))
    if not local_password_valid:
        user = _authenticate_supabase_password(normalized_email, payload.password, db)
    if not user:
        _record_login_failure(normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not getattr(user, "email_verified", False):
        if _smtp_is_configured():
            _send_verification_email(user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. A confirmation link has been sent to your inbox.",
        )

    _clear_login_failures(normalized_email)

    if security.password_needs_rehash(user.hashed_password):
        user.hashed_password = security.get_password_hash(payload.password)
        db.add(user)
        db.commit()
        db.refresh(user)

    expires_delta = timedelta(days=security.REFRESH_TOKEN_EXPIRE_DAYS) if payload.remember else None
    token = security.create_access_token({"sub": str(user.id), "email": user.email}, expires_delta=expires_delta)
    security.set_auth_cookies(response, token, remember=payload.remember)
    return _auth_response(request, user, token)


@router.post("/login/form")
def login_form(
    request: Request,
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    remember: bool = Form(False),
    db: Session = Depends(get_db),
):
    """
    Form-based login endpoint (application/x-www-form-urlencoded).
    Useful as a fallback when XHR CORS fails or browsers block fetch.
    """
    _check_rate_limit(request)
    normalized_email = _normalize_email(email)

    user = db.query(User).filter(User.email == normalized_email).first()
    local_password_valid = bool(user and security.verify_password(password, user.hashed_password))
    if not local_password_valid:
        user = _authenticate_supabase_password(normalized_email, password, db)
    if not user:
        _record_login_failure(normalized_email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not getattr(user, "email_verified", False):
        if _smtp_is_configured():
            _send_verification_email(user)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. A confirmation link has been sent to your inbox.",
        )

    _clear_login_failures(normalized_email)

    if security.password_needs_rehash(user.hashed_password):
        user.hashed_password = security.get_password_hash(password)
        db.add(user)
        db.commit()
        db.refresh(user)

    expires_delta = timedelta(days=security.REFRESH_TOKEN_EXPIRE_DAYS) if remember else None
    token = security.create_access_token({"sub": str(user.id), "email": user.email}, expires_delta=expires_delta)
    security.set_auth_cookies(response, token, remember=remember)
    return _auth_response(request, user, token)


@router.post("/logout")
def logout(response: Response):
    security.clear_auth_cookies(response)
    return {"status": "ok"}


@router.post("/logout/form")
def logout_form(response: Response):
    """
    Form-based logout endpoint: accepts application/x-www-form-urlencoded.
    Useful as a fallback when XHR CORS fails.
    """
    security.clear_auth_cookies(response)
    # Redirect to home page after logout (form submission)
    return {"status": "ok", "redirect": "/"}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "photo_url": current_user.photo_url,
        "role": current_user.role,
    }


@router.put("/me")
def update_me(payload: UpdateMeRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if payload.new_password is not None:
        if not payload.current_password:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Current password is required.")

        changed_in_supabase = _change_supabase_password(user.email, payload.current_password, payload.new_password)
        if not changed_in_supabase and not security.verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
        user.hashed_password = security.get_password_hash(payload.new_password)
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.photo_url is not None:
        user.photo_url = payload.photo_url
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "photo_url": user.photo_url,
        "role": user.role,
    }


@router.post("/me/photo")
async def update_profile_photo(
    request: Request,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = (file.content_type or "").lower()
    signatures = PROFILE_IMAGE_SIGNATURES.get(content_type)
    if not signatures:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF, or WEBP images are supported.")

    contents = await file.read(PROFILE_IMAGE_MAX_BYTES + 1)
    if len(contents) > PROFILE_IMAGE_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Profile image must be smaller than 5 MB.")
    if not any(contents.startswith(signature) for signature in signatures):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.")
    if content_type == "image/webp" and (len(contents) < 12 or contents[8:12] != b"WEBP"):
        raise HTTPException(status_code=400, detail="The uploaded WEBP file is invalid.")

    extension = {"image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp"}[content_type]
    profile_dir = Path(os.environ.get("MBAARA_STATIC_DIR", "/tmp/mbaara/static")) / "profiles"
    profile_dir.mkdir(parents=True, exist_ok=True)
    filename = f"profile_{uuid.uuid4().hex}.{extension}"
    (profile_dir / filename).write_bytes(contents)

    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Votre session utilisateur doit être renouvelée.")
    user.photo_url = str(request.url_for("static", path=f"profiles/{filename}"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"photo_url": user.photo_url, "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "photo_url": user.photo_url, "role": user.role}}


@router.post("/reset-password-request")
def reset_password_request(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        # Opaque, single-purpose token: unlike a signed JWT, it carries no
        # claims and is not accepted by get_current_user, so leaking it only
        # exposes the password-reset action, not full account access.
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        reset_tokens[token_hash] = (user.id, time.time() + (15 * 60))
        _send_password_reset_email(user, token)
    return {"status": "ok"}


@router.post("/reset-password")
def reset_password(request: Request, payload: ResetPasswordConfirmRequest, db: Session = Depends(get_db)):
    _check_rate_limit(request)
    token_hash = hashlib.sha256(payload.resetToken.encode("utf-8")).hexdigest()
    stored = reset_tokens.get(token_hash)
    if not stored:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    user_id, expires_at = stored
    if time.time() > expires_at:
        del reset_tokens[token_hash]
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token expired")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = security.get_password_hash(payload.newPassword)
    db.add(user)
    db.commit()
    del reset_tokens[token_hash]
    return {"status": "ok"}
