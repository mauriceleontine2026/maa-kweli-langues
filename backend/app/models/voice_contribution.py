from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint

from ..database import Base


class ContributorConsent(Base):
    __tablename__ = "contributor_consents"

    id = Column(Integer, primary_key=True, index=True)
    contributor_id = Column(String(255), nullable=False, index=True)
    version = Column(String(80), nullable=False)
    collection_review = Column(Boolean, nullable=False, default=False)
    tts_internal = Column(Boolean, nullable=False, default=False)
    public_dataset = Column(Boolean, nullable=False, default=False)
    dataset_license = Column(String(80), nullable=True)
    consented_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    withdrawn_at = Column(DateTime, nullable=True)


class ContributionPrompt(Base):
    __tablename__ = "contribution_prompts"

    id = Column(Integer, primary_key=True, index=True)
    language_code = Column(String(50), nullable=False, index=True)
    text = Column(String(1000), nullable=False)
    translation_fr = Column(String(1000), nullable=False)
    variant = Column(String(120), nullable=True)
    status = Column(String(30), nullable=False, default="draft", index=True)
    native_verified = Column(Boolean, nullable=False, default=False)
    created_by_id = Column(String(255), nullable=False)
    approved_by_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class VoiceRecording(Base):
    __tablename__ = "voice_recordings"
    __table_args__ = (
        UniqueConstraint("contributor_id", "checksum_sha256", name="uq_voice_recording_contributor_checksum"),
    )

    id = Column(Integer, primary_key=True, index=True)
    contribution_id = Column(Integer, ForeignKey("contributions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    contributor_id = Column(String(255), nullable=False, index=True)
    prompt_id = Column(Integer, ForeignKey("contribution_prompts.id"), nullable=False, index=True)
    consent_id = Column(Integer, ForeignKey("contributor_consents.id"), nullable=False, index=True)
    language_code = Column(String(50), nullable=False, index=True)
    iso639_3 = Column(String(3), nullable=False, index=True)
    tts_model_id = Column(String(255), nullable=True)
    variant = Column(String(120), nullable=True)
    storage_key = Column(String(1024), nullable=False, unique=True)
    original_mime_type = Column(String(120), nullable=False)
    file_extension = Column(String(12), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    sample_rate_hz = Column(Integer, nullable=True)
    channels = Column(Integer, nullable=True)
    checksum_sha256 = Column(String(64), nullable=False)
    status = Column(String(40), nullable=False, default="uploaded", index=True)
    rejection_reason = Column(Text, nullable=True)
    reviewer_native_verified = Column(Boolean, nullable=False, default=False)
    reviewed_by_id = Column(String(255), nullable=True)
    audio_quality = Column(Integer, nullable=True)
    pronunciation_quality = Column(Integer, nullable=True)
    review_comment = Column(Text, nullable=True)
    publication_status = Column(String(30), nullable=False, default="pending", index=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)