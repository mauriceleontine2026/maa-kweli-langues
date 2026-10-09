import hashlib
import logging
import re
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask
from ..database import get_db
from ..models.contribution import Contribution
from ..models.language import Language
from ..models.language_adapter import LanguageCodeAdapter
from ..models.voice_contribution import ContributorConsent, ContributionPrompt, VoiceRecording
from ..models.vocabulary import VocabularyItem
from ..services.audio_validation import AudioMetadataError, inspect_audio_metadata
from ..services.dataset_export import DatasetExportError, build_dataset_export
from ..services.contribution_storage import (
    ContributionStorageError,
    create_audio_signed_url,
    delete_audio,
    download_audio,
    store_audio,
)
from ..services.security import RateLimiter, get_current_user, require_admin
from .audio import MAX_UPLOAD_BYTES, _read_upload_with_limit, validate_audio_upload_bytes

router = APIRouter()

_contribution_rate_limiter = RateLimiter(max_attempts=10, window_seconds=60)
VOICE_CONSENT_VERSION = "voice-consent-v1"
PUBLIC_DATASET_LICENSE = "CC BY 4.0"
logger = logging.getLogger(__name__)
RECORDED_MIME_EXTENSIONS = {
    "audio/aac": ".aac",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
}


def _sanitize_text(value: str | None, *, max_length: int, allow_newlines: bool = False) -> str | None:
    if value is None:
        return None
    text = value.strip()
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
    if not allow_newlines:
        text = text.replace("\n", " ").replace("\r", " ")
    if len(text) > max_length:
        raise ValueError(f"Text exceeds maximum length of {max_length} characters")
    return text


class ContributionCreateRequest(BaseModel):
    language_code: str = Field(..., max_length=50)
    word: str = Field(..., max_length=200)
    translation_fr: str | None = Field(default=None, max_length=200)
    phonetic: str | None = Field(default=None, max_length=200)
    contributor_name: str | None = Field(default=None, max_length=200)
    region: str | None = Field(default=None, max_length=200)
    context_notes: str | None = Field(default=None, max_length=2000)
    audio_url: str | None = Field(default=None, max_length=1000)

    @field_validator("language_code", "word", "translation_fr", "phonetic", "contributor_name", "region", "context_notes")
    @classmethod
    def sanitize_text_fields(cls, value: str | None, info) -> str | None:
        max_length = {
            "language_code": 50,
            "word": 200,
            "translation_fr": 200,
            "phonetic": 200,
            "contributor_name": 200,
            "region": 200,
            "context_notes": 2000,
        }.get(info.field_name, 200)
        return _sanitize_text(value, max_length=max_length, allow_newlines=(info.field_name == "context_notes"))

    @field_validator("audio_url")
    @classmethod
    def validate_audio_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        sanitized = _sanitize_text(value, max_length=1000)
        if sanitized and not sanitized.startswith(("http://", "https://")):
            raise ValueError("audio_url must be an absolute http/https URL")
        return sanitized


class ContributionUpdateRequest(BaseModel):
    status: str
    reviewer_native_verified: bool = False
    audio_quality: int | None = Field(default=None, ge=1, le=5)
    pronunciation_quality: int | None = Field(default=None, ge=1, le=5)
    review_comment: str | None = Field(default=None, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        sanitized = _sanitize_text(value, max_length=50)
        allowed = {"pending", "approved", "rejected", "needs_retry"}
        if sanitized not in allowed:
            raise ValueError("status must be one of: pending, approved, rejected, needs_retry")
        return sanitized

    @field_validator("review_comment")
    @classmethod
    def sanitize_review_comment(cls, value: str | None) -> str | None:
        return _sanitize_text(value, max_length=1000, allow_newlines=True)


class ConsentCreateRequest(BaseModel):
    collection_review: bool
    tts_internal: bool = False
    public_dataset: bool = False


class ContributionPromptRequest(BaseModel):
    language_code: str = Field(..., min_length=2, max_length=50)
    text: str = Field(..., min_length=1, max_length=1000)
    translation_fr: str = Field(..., min_length=1, max_length=1000)
    variant: str | None = Field(default=None, max_length=120)
    status: str = Field(default="draft", max_length=30)
    native_verified: bool = False

    @field_validator("language_code", "text", "translation_fr", "variant")
    @classmethod
    def sanitize_prompt_fields(cls, value: str | None) -> str | None:
        return _sanitize_text(value, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_prompt_status(cls, value: str) -> str:
        sanitized = _sanitize_text(value, max_length=30)
        if sanitized not in {"draft", "approved", "inactive"}:
            raise ValueError("status must be draft, approved, or inactive")
        return sanitized


class ContributionReportRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


async def _validate_recording_upload(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No audio file provided")
    try:
        contents = await _read_upload_with_limit(file, MAX_UPLOAD_BYTES)
        suffix = validate_audio_upload_bytes(file.filename, contents)
    except ValueError as exc:
        detail = str(exc)
        response_status = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE if "too large" in detail.lower() else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=response_status, detail=detail) from exc

    mime_type = (file.content_type or "").split(";")[0].strip().lower()
    if RECORDED_MIME_EXTENSIONS.get(mime_type) != suffix:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Audio MIME type does not match the file format")
    try:
        audio_metadata = inspect_audio_metadata(contents, suffix[1:])
    except AudioMetadataError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    checksum = hashlib.sha256(contents).hexdigest()
    return contents, suffix, mime_type, audio_metadata, checksum


def _prompt_response(prompt: ContributionPrompt, adapter: LanguageCodeAdapter | None = None) -> dict:
    return {
        "id": prompt.id,
        "language_code": prompt.language_code,
        "text": prompt.text,
        "translation_fr": prompt.translation_fr,
        "variant": prompt.variant,
        "status": prompt.status,
        "native_verified": prompt.native_verified,
        "iso639_3": adapter.iso639_3 if adapter else None,
        "tts_model_id": adapter.tts_model_id if adapter else None,
        "created_at": prompt.created_at.isoformat(),
    }


@router.get("/prompts")
def list_contribution_prompts(
    language_code: str | None = None,
    include_drafts: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(ContributionPrompt, LanguageCodeAdapter).outerjoin(
        LanguageCodeAdapter,
        LanguageCodeAdapter.language_code == ContributionPrompt.language_code,
    ).join(Language, Language.code == ContributionPrompt.language_code)
    if include_drafts:
        if current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    else:
        query = query.filter(
            ContributionPrompt.status == "approved",
            ContributionPrompt.native_verified.is_(True),
            LanguageCodeAdapter.iso639_3.is_not(None),
            Language.status == "active",
        )
    if language_code:
        query = query.filter(ContributionPrompt.language_code == language_code)
    return [
        _prompt_response(prompt, adapter)
        for prompt, adapter in query.order_by(ContributionPrompt.id.asc()).all()
    ]


@router.post("/prompts", status_code=status.HTTP_201_CREATED)
def create_contribution_prompt(
    payload: ContributionPromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    language = db.query(Language).filter(Language.code == payload.language_code).first()
    if not language:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    if payload.status == "approved" and language.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Inactive languages cannot receive approved prompts")
    if payload.status == "approved" and not payload.native_verified:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Native review is required before approval")
    if payload.status == "approved" and not payload.variant:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A verified language variant is required before approval")
    prompt = ContributionPrompt(
        **payload.model_dump(),
        created_by_id=str(current_user.id),
        approved_by_id=str(current_user.id) if payload.status == "approved" else None,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return _prompt_response(prompt)


@router.put("/prompts/{prompt_id}")
def update_contribution_prompt(
    prompt_id: int,
    payload: ContributionPromptRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    prompt = db.query(ContributionPrompt).filter(ContributionPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found")
    language = db.query(Language).filter(Language.code == payload.language_code).first()
    if not language:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Language not found")
    if payload.status == "approved" and language.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Inactive languages cannot receive approved prompts")
    if payload.status == "approved" and not payload.native_verified:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Native review is required before approval")
    if payload.status == "approved" and not payload.variant:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A verified language variant is required before approval")
    for field, value in payload.model_dump().items():
        setattr(prompt, field, value)
    prompt.approved_by_id = str(current_user.id) if payload.status == "approved" else None
    prompt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prompt)
    return _prompt_response(prompt)


@router.post("/consent", status_code=status.HTTP_201_CREATED)
def record_contributor_consent(
    payload: ConsentCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_contribution_rate_limiter),
):
    if not payload.collection_review:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Collection and review consent is required")
    consent = ContributorConsent(
        contributor_id=str(current_user.id),
        version=VOICE_CONSENT_VERSION,
        collection_review=True,
        tts_internal=payload.tts_internal,
        public_dataset=payload.public_dataset,
        dataset_license=PUBLIC_DATASET_LICENSE if payload.public_dataset else None,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return {
        "id": consent.id,
        "version": consent.version,
        "collection_review": consent.collection_review,
        "tts_internal": consent.tts_internal,
        "public_dataset": consent.public_dataset,
        "dataset_license": consent.dataset_license,
        "consented_at": consent.consented_at.isoformat(),
    }


@router.get("/consent")
def get_contributor_consent(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    consent = (
        db.query(ContributorConsent)
        .filter(
            ContributorConsent.contributor_id == str(current_user.id),
            ContributorConsent.withdrawn_at.is_(None),
        )
        .order_by(ContributorConsent.consented_at.desc())
        .first()
    )
    if not consent:
        return None
    return {
        "id": consent.id,
        "version": consent.version,
        "collection_review": consent.collection_review,
        "tts_internal": consent.tts_internal,
        "public_dataset": consent.public_dataset,
        "dataset_license": consent.dataset_license,
        "consented_at": consent.consented_at.isoformat(),
    }


def _serialize_contribution(contribution: Contribution, db: Session) -> dict:
    result = {
        "id": contribution.id,
        "language_code": contribution.language_code,
        "word": contribution.word,
        "translation_fr": contribution.translation_fr,
        "phonetic": contribution.phonetic,
        "contributor_name": contribution.contributor_name,
        "region": contribution.region,
        "context_notes": contribution.context_notes,
        "audio_url": contribution.audio_url,
        "status": contribution.status,
        "created_by_id": contribution.created_by_id,
        "created_at": contribution.created_at.isoformat(),
    }
    recording = db.query(VoiceRecording).filter(VoiceRecording.contribution_id == contribution.id).first()
    if recording:
        consent = db.query(ContributorConsent).filter(ContributorConsent.id == recording.consent_id).first()
        result.update(
            recording_id=recording.id,
            prompt_id=recording.prompt_id,
            recording_status=recording.status,
            rejection_reason=recording.rejection_reason,
            duration_seconds=recording.duration_seconds,
            checksum_sha256=recording.checksum_sha256,
            variant=recording.variant,
            consent_tts_internal=bool(consent and consent.tts_internal and consent.withdrawn_at is None),
            consent_public_dataset=bool(consent and consent.public_dataset and consent.withdrawn_at is None),
            dataset_license=consent.dataset_license if consent and consent.withdrawn_at is None else None,
            reviewer_native_verified=recording.reviewer_native_verified,
            audio_quality=recording.audio_quality,
            pronunciation_quality=recording.pronunciation_quality,
            review_comment=recording.review_comment,
            publication_status=recording.publication_status,
        )
        if recording.status in {"withdrawn", "deleted"}:
            result["audio_url"] = None
        else:
            try:
                result["audio_url"] = create_audio_signed_url(recording.storage_key)
            except ContributionStorageError:
                logger.exception("Could not create a signed URL for contribution %s", contribution.id)
                result["audio_url"] = None
    return result


def _remove_export_directory(archive_path: str) -> None:
    shutil.rmtree(Path(archive_path).parent, ignore_errors=True)


def _assert_recording_is_available_for_approval(recording: VoiceRecording) -> None:
    if not recording or not recording.storage_key:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A stored recording is required before approval")
    try:
        download_audio(recording.storage_key)
    except ContributionStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The approved recording is not available in the private storage bucket.",
        ) from exc


def _publish_approved_recording(db: Session, recording: VoiceRecording, contribution: Contribution) -> None:
    existing = db.query(VocabularyItem).filter(VocabularyItem.source_recording_id == recording.id).first()
    if existing:
        return
    db.add(
        VocabularyItem(
            language_code=recording.language_code,
            lesson_number=1,
            word=contribution.word,
            translation_fr=contribution.translation_fr,
            phonetic=contribution.phonetic,
            example_target=contribution.context_notes,
            audio_url=f"/api/contributions/recordings/{recording.id}/audio",
            difficulty="approved-contribution",
            source_recording_id=recording.id,
        )
    )


@router.get("/approved-resources")
def list_approved_contribution_resources(db: Session = Depends(get_db)):
    rows = (
        db.query(VocabularyItem)
        .join(VoiceRecording, VoiceRecording.id == VocabularyItem.source_recording_id)
        .filter(
            VoiceRecording.status == "approved",
            VoiceRecording.publication_status == "published",
            VoiceRecording.reviewer_native_verified.is_(True),
            VoiceRecording.contributor_id.is_not(None),
        )
        .order_by(VocabularyItem.id.asc())
        .all()
    )
    return [
        {
            "id": item.id,
            "language_code": item.language_code,
            "word": item.word,
            "translation_fr": item.translation_fr,
            "phonetic": item.phonetic,
            "example_target": item.example_target,
            "audio_url": item.audio_url,
            "source_recording_id": item.source_recording_id,
        }
        for item in rows
    ]


@router.get("/recordings/{recording_id}/audio")
def get_approved_recording_audio(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    recording = db.query(VoiceRecording).filter(VoiceRecording.id == recording_id).first()
    if not recording or recording.publication_status != "published" or recording.status != "approved":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approved recording not found")
    try:
        signed_url = create_audio_signed_url(recording.storage_key)
    except ContributionStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Approved audio is temporarily unavailable.") from exc
    return RedirectResponse(signed_url, status_code=status.HTTP_302_FOUND)


@router.get("/export")
def export_approved_dataset(
    scope: str = "internal_tts",
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    try:
        archive_path, filename = build_dataset_export(db, scope)
    except DatasetExportError as exc:
        message = str(exc)
        response_status = (
            status.HTTP_422_UNPROCESSABLE_ENTITY if "scope must" in message
            else status.HTTP_404_NOT_FOUND if "No approved recordings" in message
            else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        raise HTTPException(status_code=response_status, detail=message) from exc
    return FileResponse(
        archive_path,
        media_type="application/zip",
        filename=filename,
        background=BackgroundTask(_remove_export_directory, archive_path),
    )


@router.post("/recordings", status_code=status.HTTP_201_CREATED)
async def create_voice_recording(
    file: UploadFile = File(...),
    consent_id: int = Form(...),
    prompt_id: int = Form(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate_limit=Depends(_contribution_rate_limiter),
):
    contributor_id = str(current_user.id)
    consent = (
        db.query(ContributorConsent)
        .filter(
            ContributorConsent.id == consent_id,
            ContributorConsent.contributor_id == contributor_id,
            ContributorConsent.withdrawn_at.is_(None),
            ContributorConsent.version == VOICE_CONSENT_VERSION,
            ContributorConsent.collection_review.is_(True),
        )
        .first()
    )
    if not consent:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An active collection consent is required")

    prompt = (
        db.query(ContributionPrompt)
        .filter(
            ContributionPrompt.id == prompt_id,
            ContributionPrompt.status == "approved",
            ContributionPrompt.native_verified.is_(True),
        )
        .first()
    )
    if not prompt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An approved native-reviewed prompt is required")
    language_adapter = (
        db.query(LanguageCodeAdapter)
        .filter(LanguageCodeAdapter.language_code == prompt.language_code)
        .first()
    )
    if not language_adapter:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A verified ISO 639-3 language mapping is required")

    contents, suffix, mime_type, audio_metadata, checksum = await _validate_recording_upload(file)
    duplicate = (
        db.query(VoiceRecording.id)
        .filter(VoiceRecording.contributor_id == contributor_id, VoiceRecording.checksum_sha256 == checksum)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This audio has already been submitted")

    storage_key = f"contributions/{contributor_id}/{uuid.uuid4().hex}{suffix}"
    try:
        store_audio(storage_key, contents, mime_type)
    except ContributionStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    contribution = Contribution(
        language_code=prompt.language_code,
        word=prompt.text,
        translation_fr=prompt.translation_fr,
        region=None,
        audio_url=None,
        status="pending",
        created_by_id=contributor_id,
    )
    db.add(contribution)
    try:
        db.flush()
        recording = VoiceRecording(
            contribution_id=contribution.id,
            contributor_id=contributor_id,
            prompt_id=prompt.id,
            consent_id=consent.id,
            language_code=prompt.language_code,
            iso639_3=language_adapter.iso639_3,
            tts_model_id=language_adapter.tts_model_id,
            variant=prompt.variant,
            storage_key=storage_key,
            original_mime_type=mime_type,
            file_extension=suffix[1:],
            size_bytes=len(contents),
            duration_seconds=audio_metadata["duration_seconds"],
            sample_rate_hz=audio_metadata["sample_rate_hz"],
            channels=audio_metadata["channels"],
            checksum_sha256=checksum,
            status="pending_native_review",
        )
        db.add(recording)
        db.commit()
        db.refresh(contribution)
        db.refresh(recording)
    except Exception as exc:
        db.rollback()
        try:
            delete_audio(storage_key)
        except ContributionStorageError:
            logger.exception("Could not remove orphaned contribution audio after database failure")
        if exc.__class__.__name__ == "IntegrityError":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This audio has already been submitted") from exc
        raise

    return {
        "contribution_id": contribution.id,
        "recording_id": recording.id,
        "status": recording.status,
        "duration_seconds": recording.duration_seconds,
        "checksum_sha256": recording.checksum_sha256,
    }


@router.post("/recordings/{recording_id}/retry")
async def retry_voice_recording(
    recording_id: int,
    file: UploadFile = File(...),
    consent_id: int = Form(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
    _rate_limit=Depends(_contribution_rate_limiter),
):
    recording = (
        db.query(VoiceRecording)
        .filter(
            VoiceRecording.id == recording_id,
            VoiceRecording.contributor_id == str(current_user.id),
        )
        .first()
    )
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    if recording.status not in {"rejected", "needs_retry", "reported"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This recording is not eligible for retry")
    consent = (
        db.query(ContributorConsent)
        .filter(
            ContributorConsent.id == consent_id,
            ContributorConsent.contributor_id == str(current_user.id),
            ContributorConsent.withdrawn_at.is_(None),
            ContributorConsent.version == VOICE_CONSENT_VERSION,
            ContributorConsent.collection_review.is_(True),
        )
        .first()
    )
    if not consent:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="An active collection consent is required")
    prompt = (
        db.query(ContributionPrompt)
        .filter(
            ContributionPrompt.id == recording.prompt_id,
            ContributionPrompt.status == "approved",
            ContributionPrompt.native_verified.is_(True),
        )
        .first()
    )
    if not prompt:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The original prompt is no longer approved")
    language_adapter = (
        db.query(LanguageCodeAdapter)
        .filter(LanguageCodeAdapter.language_code == prompt.language_code)
        .first()
    )
    if not language_adapter:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A verified ISO 639-3 language mapping is required")

    contents, suffix, mime_type, audio_metadata, checksum = await _validate_recording_upload(file)
    duplicate = (
        db.query(VoiceRecording.id)
        .filter(
            VoiceRecording.contributor_id == str(current_user.id),
            VoiceRecording.checksum_sha256 == checksum,
            VoiceRecording.id != recording.id,
        )
        .first()
    )
    if duplicate or checksum == recording.checksum_sha256:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This audio has already been submitted")

    previous_storage_key = recording.storage_key
    next_storage_key = f"contributions/{current_user.id}/{uuid.uuid4().hex}{suffix}"
    try:
        store_audio(next_storage_key, contents, mime_type)
    except ContributionStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    recording.consent_id = consent.id
    recording.iso639_3 = language_adapter.iso639_3
    recording.tts_model_id = language_adapter.tts_model_id
    recording.storage_key = next_storage_key
    recording.original_mime_type = mime_type
    recording.file_extension = suffix[1:]
    recording.size_bytes = len(contents)
    recording.duration_seconds = audio_metadata["duration_seconds"]
    recording.sample_rate_hz = audio_metadata["sample_rate_hz"]
    recording.channels = audio_metadata["channels"]
    recording.checksum_sha256 = checksum
    recording.status = "pending_native_review"
    recording.rejection_reason = None
    contribution = db.query(Contribution).filter(Contribution.id == recording.contribution_id).first()
    if contribution:
        contribution.status = "pending"
    try:
        db.commit()
    except Exception:
        db.rollback()
        try:
            delete_audio(next_storage_key)
        except ContributionStorageError:
            logger.exception("Could not remove replacement audio after database failure")
        raise
    try:
        delete_audio(previous_storage_key)
    except ContributionStorageError:
        logger.exception("Could not remove replaced audio recording %s", recording.id)
    return {
        "contribution_id": recording.contribution_id,
        "recording_id": recording.id,
        "status": recording.status,
        "duration_seconds": recording.duration_seconds,
        "checksum_sha256": recording.checksum_sha256,
    }


@router.get("/progress")
def get_contribution_progress(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    recordings = db.query(VoiceRecording).filter(VoiceRecording.contributor_id == str(current_user.id)).all()
    return {
        "total": len(recordings),
        "pending": sum(recording.status in {"uploaded", "pending_native_review", "quality_check", "processing", "reported"} for recording in recordings),
        "approved": sum(recording.status == "approved" for recording in recordings),
        "rejected": sum(recording.status in {"rejected", "needs_retry"} for recording in recordings),
        "withdrawn": sum(recording.status in {"withdrawn", "deleted"} for recording in recordings),
    }


@router.get("/recordings/{recording_id}/status")
def get_recording_status(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(VoiceRecording).filter(VoiceRecording.id == recording_id)
    if current_user.role != "admin":
        query = query.filter(VoiceRecording.contributor_id == str(current_user.id))
    recording = query.first()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    return {
        "id": recording.id,
        "status": recording.status,
        "rejection_reason": recording.rejection_reason,
        "updated_at": recording.updated_at.isoformat(),
    }


@router.delete("/recordings/{recording_id}")
def delete_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(VoiceRecording).filter(VoiceRecording.id == recording_id)
    if current_user.role != "admin":
        query = query.filter(VoiceRecording.contributor_id == str(current_user.id))
    recording = query.first()
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    try:
        delete_audio(recording.storage_key)
    except ContributionStorageError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    recording.status = "deleted"
    contribution = db.query(Contribution).filter(Contribution.id == recording.contribution_id).first()
    if contribution:
        contribution.status = "withdrawn"
    db.commit()
    return {"id": recording.id, "status": recording.status}


@router.post("/recordings/{recording_id}/report")
def report_recording(
    recording_id: int,
    payload: ContributionReportRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    recording = (
        db.query(VoiceRecording)
        .filter(VoiceRecording.id == recording_id, VoiceRecording.contributor_id == str(current_user.id))
        .first()
    )
    if not recording:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    recording.status = "reported"
    recording.rejection_reason = _sanitize_text(payload.reason, max_length=1000)
    db.commit()
    return {"id": recording.id, "status": recording.status}


@router.post("/withdraw-consent")
def withdraw_contributor_consent(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    consents = (
        db.query(ContributorConsent)
        .filter(
            ContributorConsent.contributor_id == str(current_user.id),
            ContributorConsent.withdrawn_at.is_(None),
        )
        .all()
    )
    if not consents:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active consent found")
    consent_ids = [consent.id for consent in consents]
    for consent in consents:
        consent.withdrawn_at = datetime.utcnow()
    recordings = db.query(VoiceRecording).filter(VoiceRecording.consent_id.in_(consent_ids)).all()
    for recording in recordings:
        recording.status = "withdrawn"
        recording.publication_status = "withdrawn"
        recording.published_at = None
        contribution = db.query(Contribution).filter(Contribution.id == recording.contribution_id).first()
        if contribution:
            contribution.status = "withdrawn"
        db.query(VocabularyItem).filter(
            VocabularyItem.source_recording_id == recording.id
        ).delete(synchronize_session=False)
    db.commit()
    deletion_failures = 0
    for recording in recordings:
        try:
            delete_audio(recording.storage_key)
        except ContributionStorageError:
            deletion_failures += 1
            logger.exception("Could not delete withdrawn audio recording %s", recording.id)
    return {"consent_ids": consent_ids, "status": "withdrawn", "storage_deletion_failures": deletion_failures}


@router.get("")
def list_contributions(created_by_id: str | None = None, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Contribution)
    if current_user.role != 'admin':
        query = query.filter(Contribution.created_by_id == str(current_user.id))
    elif created_by_id:
        query = query.filter(Contribution.created_by_id == created_by_id)
    contributions = query.order_by(Contribution.created_at.desc()).all()
    return [_serialize_contribution(contribution, db) for contribution in contributions]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_contribution(
    payload: ContributionCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _rate_limit=Depends(_contribution_rate_limiter),
):
    contribution = Contribution(
        language_code=payload.language_code,
        word=payload.word,
        translation_fr=payload.translation_fr,
        phonetic=payload.phonetic,
        contributor_name=payload.contributor_name,
        region=payload.region,
        context_notes=payload.context_notes,
        audio_url=payload.audio_url,
        status="pending",
        created_by_id=str(current_user.id),
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return {
        "id": contribution.id,
        "language_code": contribution.language_code,
        "word": contribution.word,
        "translation_fr": contribution.translation_fr,
        "phonetic": contribution.phonetic,
        "contributor_name": contribution.contributor_name,
        "region": contribution.region,
        "context_notes": contribution.context_notes,
        "audio_url": contribution.audio_url,
        "status": contribution.status,
        "created_by_id": contribution.created_by_id,
        "created_at": contribution.created_at.isoformat(),
    }


@router.put("/{contribution_id}")
def update_contribution(contribution_id: int, payload: ContributionUpdateRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    contribution = db.query(Contribution).filter(Contribution.id == contribution_id).first()
    if not contribution:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    recording = db.query(VoiceRecording).filter(VoiceRecording.contribution_id == contribution.id).first()
    if recording:
        consent = db.query(ContributorConsent).filter(ContributorConsent.id == recording.consent_id).first()
        if payload.status == "approved" and (not consent or consent.withdrawn_at is not None):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Withdrawn recordings cannot be approved")
        if payload.status in {"approved", "rejected", "needs_retry"} and not payload.reviewer_native_verified:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Native-speaker review attestation is required")
        if payload.status == "approved":
            _assert_recording_is_available_for_approval(recording)
        recording.status = "pending_native_review" if payload.status == "pending" else payload.status
        recording.reviewer_native_verified = payload.reviewer_native_verified
        recording.reviewed_by_id = str(current_user.id)
        recording.audio_quality = payload.audio_quality
        recording.pronunciation_quality = payload.pronunciation_quality
        recording.review_comment = payload.review_comment
        recording.rejection_reason = payload.review_comment if payload.status in {"rejected", "needs_retry"} else None
        if payload.status == "approved":
            if consent.tts_internal and consent.withdrawn_at is None:
                recording.publication_status = "published"
                recording.published_at = datetime.utcnow()
                _publish_approved_recording(db, recording, contribution)
            else:
                recording.publication_status = "not_requested"
    contribution.status = payload.status
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return _serialize_contribution(contribution, db)
