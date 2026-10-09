import re
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
import pycountry
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.language import Language
from ..models.language_adapter import LanguageCodeAdapter
from ..services.security import require_admin

router = APIRouter()


def normalize_language_text(value: str | None) -> str | None:
    if value is None:
        return None

    text = value.strip()
    if not text:
        return text

    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError):
        return text


def _sanitize_text(value: str | None, *, max_length: int) -> str | None:
    if value is None:
        return None
    text = value.strip()
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    if len(text) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length} characters")
    return normalize_language_text(text)


class LanguageCreateRequest(BaseModel):
    code: str
    name: str
    name_fr: str | None = None
    region: str | None = None
    family: str | None = None
    status: str | None = "active"
    color: str | None = None
    flag_emoji: str | None = None
    total_lessons: int | None = 0
    description: str | None = None

    @field_validator("code", "name", "name_fr", "region", "family", "status", "color", "flag_emoji", "description")
    @classmethod
    def sanitize_fields(cls, value: str | None, info) -> str | None:
        max_lengths = {
            "code": 30,
            "name": 120,
            "name_fr": 120,
            "region": 120,
            "family": 120,
            "status": 20,
            "color": 20,
            "flag_emoji": 4,
            "description": 2000,
        }
        sanitized = _sanitize_text(value, max_length=max_lengths.get(info.field_name, 200))
        if info.field_name == "code":
            if sanitized and not re.fullmatch(r"[a-z0-9_-]+", sanitized.lower()):
                raise ValueError("Language code contains invalid characters")
            return sanitized.lower()
        return sanitized

    @field_validator("total_lessons")
    @classmethod
    def validate_total_lessons(cls, value: int | None) -> int | None:
        if value is None:
            return value
        if value < 0 or value > 10000:
            raise ValueError("total_lessons must be between 0 and 10000")
        return value


class LanguageCodeAdapterRequest(BaseModel):
    iso639_3: str = Field(..., min_length=3, max_length=3)
    tts_model_id: str | None = Field(default=None, max_length=255)

    @field_validator("iso639_3")
    @classmethod
    def validate_iso639_3(cls, value: str) -> str:
        code = value.strip().lower()
        if not re.fullmatch(r"[a-z]{3}", code) or not pycountry.languages.get(alpha_3=code):
            raise ValueError("iso639_3 must be a registered ISO 639-3 alpha-3 code")
        return code

    @field_validator("tts_model_id")
    @classmethod
    def sanitize_tts_model_id(cls, value: str | None) -> str | None:
        return _sanitize_text(value, max_length=255)


@router.get("")
def list_languages(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Language)
    if status:
        query = query.filter(Language.status == status)
    languages = query.order_by(Language.name.asc()).all()
    adapters = {
        adapter.language_code: adapter
        for adapter in db.query(LanguageCodeAdapter).filter(LanguageCodeAdapter.language_code.in_([lang.code for lang in languages])).all()
    }
    return [
        {
            "id": lang.id,
            "code": lang.code,
            "name": normalize_language_text(lang.name),
            "name_fr": normalize_language_text(lang.name_fr),
            "region": lang.region,
            "family": lang.family,
            "status": lang.status,
            "color": lang.color,
            "flag_emoji": lang.flag_emoji,
            "total_lessons": lang.total_lessons,
            "description": lang.description,
            "iso639_3": adapters[lang.code].iso639_3 if lang.code in adapters else None,
            "tts_model_id": adapters[lang.code].tts_model_id if lang.code in adapters else None,
        }
        for lang in languages
    ]


@router.get("/{code}")
def get_language(code: str, db: Session = Depends(get_db)):
    language = db.query(Language).filter(Language.code == code).first()
    if not language:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    adapter = db.query(LanguageCodeAdapter).filter(LanguageCodeAdapter.language_code == code).first()
    return {
        "id": language.id,
        "code": language.code,
        "name": normalize_language_text(language.name),
        "name_fr": normalize_language_text(language.name_fr),
        "region": language.region,
        "family": language.family,
        "status": language.status,
        "color": language.color,
        "flag_emoji": language.flag_emoji,
        "total_lessons": language.total_lessons,
        "description": language.description,
        "iso639_3": adapter.iso639_3 if adapter else None,
        "tts_model_id": adapter.tts_model_id if adapter else None,
    }


@router.get("/{code}/adapter")
def get_language_code_adapter(code: str, db: Session = Depends(get_db)):
    language = db.query(Language).filter(Language.code == code).first()
    if not language:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    adapter = db.query(LanguageCodeAdapter).filter(LanguageCodeAdapter.language_code == code).first()
    if not adapter:
        return None
    return {"language_code": adapter.language_code, "iso639_3": adapter.iso639_3, "tts_model_id": adapter.tts_model_id}


@router.put("/{code}/adapter")
def save_language_code_adapter(
    code: str,
    payload: LanguageCodeAdapterRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if not db.query(Language.id).filter(Language.code == code).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    adapter = db.query(LanguageCodeAdapter).filter(LanguageCodeAdapter.language_code == code).first()
    if not adapter:
        adapter = LanguageCodeAdapter(language_code=code, verified_by_id=str(current_user.id))
        db.add(adapter)
    adapter.iso639_3 = payload.iso639_3
    adapter.tts_model_id = payload.tts_model_id
    adapter.verified_by_id = str(current_user.id)
    db.commit()
    db.refresh(adapter)
    return {"language_code": adapter.language_code, "iso639_3": adapter.iso639_3, "tts_model_id": adapter.tts_model_id}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_language(payload: LanguageCreateRequest, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    existing = db.query(Language).filter(Language.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language code already exists")
    language = Language(
        code=payload.code,
        name=payload.name,
        name_fr=payload.name_fr or payload.name,
        region=payload.region,
        family=payload.family,
        status=payload.status or "active",
        color=payload.color,
        flag_emoji=payload.flag_emoji,
        total_lessons=payload.total_lessons or 0,
        description=payload.description,
    )
    db.add(language)
    db.commit()
    db.refresh(language)
    return {
        "id": language.id,
        "code": language.code,
        "name": language.name,
        "name_fr": language.name_fr,
        "region": language.region,
        "family": language.family,
        "status": language.status,
        "color": language.color,
        "flag_emoji": language.flag_emoji,
        "total_lessons": language.total_lessons,
        "description": language.description,
    }
