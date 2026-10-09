import asyncio
from importlib import import_module
from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.datastructures import Headers, UploadFile

from backend.app.database import Base
from backend.app.models.contribution import Contribution
from backend.app.models.language import Language
from backend.app.models.language_adapter import LanguageCodeAdapter
from backend.app.models.voice_contribution import ContributorConsent, ContributionPrompt, VoiceRecording
from backend.app.models.vocabulary import VocabularyItem
from backend.app.services.contribution_storage import ContributionStorageError

contributions = import_module("backend.app.routers.contributions")


@pytest.fixture
def contribution_api():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    user = SimpleNamespace(id=41, role="user")
    language = Language(code="bam", name="Bambara", name_fr="Bambara", status="active")
    prompt = ContributionPrompt(
        language_code="bam",
        text="I ni ce",
        translation_fr="Bonjour",
        variant="standard",
        status="approved",
        native_verified=True,
        created_by_id="1",
        approved_by_id="1",
    )
    consent = ContributorConsent(
        contributor_id=str(user.id),
        version=contributions.VOICE_CONSENT_VERSION,
        collection_review=True,
        tts_internal=True,
        public_dataset=True,
        dataset_license=contributions.PUBLIC_DATASET_LICENSE,
    )
    language_adapter = LanguageCodeAdapter(
        language_code="bam", iso639_3="bam", tts_model_id="facebook/mms-tts-bam", verified_by_id="1"
    )
    session.add_all([language, prompt, consent, language_adapter])
    session.commit()

    try:
        yield session, user, prompt, consent
    finally:
        session.close()
        engine.dispose()


def _recording_form(consent_id):
    return {"consent_id": consent_id, "prompt_id": 1}


def _upload_file(contents=b"\x1aE\xdf\xa3" + b"0" * 16):
    return UploadFile(
        filename="voice.webm",
        file=BytesIO(contents),
        headers=Headers({"content-type": "audio/webm"}),
    )


def test_recording_upload_requires_active_consent_before_storage(monkeypatch, contribution_api):
    session, user, _prompt, _consent = contribution_api
    stored = []
    monkeypatch.setattr(contributions, "store_audio", lambda *args: stored.append(args))

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            contributions.create_voice_recording(
                file=_upload_file(),
                **_recording_form(999),
                current_user=user,
                db=session,
            )
        )

    assert error.value.status_code == 403
    assert stored == []


def test_recording_upload_creates_pending_private_record(monkeypatch, contribution_api):
    session, user, _prompt, consent = contribution_api
    stored = []
    monkeypatch.setattr(contributions, "store_audio", lambda *args: stored.append(args))
    monkeypatch.setattr(
        contributions,
        "inspect_audio_metadata",
        lambda _contents, _extension: {"duration_seconds": 2.5, "sample_rate_hz": 48000, "channels": 1},
    )

    response = asyncio.run(
        contributions.create_voice_recording(
            file=_upload_file(),
            **_recording_form(consent.id),
            current_user=user,
            db=session,
        )
    )

    assert response["status"] == "pending_native_review"
    assert len(stored) == 1
    contribution = session.query(Contribution).one()
    recording = session.query(VoiceRecording).one()
    assert contribution.word == "I ni ce"
    assert contribution.status == "pending"
    assert recording.consent_id == consent.id
    assert recording.duration_seconds == 2.5
    assert recording.checksum_sha256 == response["checksum_sha256"]


def test_retry_replaces_audio_and_returns_recording_to_native_review(monkeypatch, contribution_api):
    session, user, prompt, consent = contribution_api
    contribution = Contribution(
        language_code="bam", word=prompt.text, translation_fr=prompt.translation_fr,
        status="needs_retry", created_by_id=str(user.id),
    )
    session.add(contribution)
    session.flush()
    recording = VoiceRecording(
        contribution_id=contribution.id, contributor_id=str(user.id), prompt_id=prompt.id,
        consent_id=consent.id, language_code="bam", iso639_3="bam", tts_model_id="facebook/mms-tts-bam", variant="standard",
        storage_key="contributions/41/old.webm", original_mime_type="audio/webm",
        file_extension="webm", size_bytes=20, duration_seconds=2.5,
        sample_rate_hz=48000, channels=1, checksum_sha256="a" * 64, status="needs_retry",
    )
    session.add(recording)
    session.commit()
    stored = []
    deleted = []
    monkeypatch.setattr(contributions, "store_audio", lambda *args: stored.append(args))
    monkeypatch.setattr(contributions, "delete_audio", lambda key: deleted.append(key))
    monkeypatch.setattr(
        contributions,
        "inspect_audio_metadata",
        lambda _contents, _extension: {"duration_seconds": 3.0, "sample_rate_hz": 48000, "channels": 1},
    )

    response = asyncio.run(
        contributions.retry_voice_recording(
            recording_id=recording.id,
            file=_upload_file(b"\x1aE\xdf\xa3" + b"1" * 16),
            consent_id=consent.id,
            current_user=user,
            db=session,
        )
    )

    session.refresh(recording)
    session.refresh(contribution)
    assert response["status"] == "pending_native_review"
    assert recording.status == "pending_native_review"
    assert recording.storage_key != "contributions/41/old.webm"
    assert recording.checksum_sha256 == response["checksum_sha256"]
    assert contribution.status == "pending"
    assert deleted == ["contributions/41/old.webm"]
    assert len(stored) == 1


def test_admin_review_requires_native_attestation_and_persists_quality_notes(monkeypatch, contribution_api):
    session, user, prompt, consent = contribution_api
    admin = SimpleNamespace(id=7, role="admin")
    contribution = Contribution(
        language_code="bam", word=prompt.text, translation_fr=prompt.translation_fr,
        status="pending", created_by_id=str(user.id),
    )
    session.add(contribution)
    session.flush()
    recording = VoiceRecording(
        contribution_id=contribution.id, contributor_id=str(user.id), prompt_id=prompt.id,
        consent_id=consent.id, language_code="bam", iso639_3="bam", tts_model_id="facebook/mms-tts-bam",
        variant="standard", storage_key="contributions/41/review.webm", original_mime_type="audio/webm",
        file_extension="webm", size_bytes=20, duration_seconds=2.5, sample_rate_hz=48000,
        channels=1, checksum_sha256="c" * 64, status="pending_native_review",
    )
    session.add(recording)
    session.commit()
    monkeypatch.setattr(contributions, "create_audio_signed_url", lambda _key: "https://signed.example.test/audio")
    monkeypatch.setattr(contributions, "download_audio", lambda _key: b"audio-bytes")

    with pytest.raises(HTTPException) as error:
        contributions.update_contribution(
            contribution.id,
            contributions.ContributionUpdateRequest(status="approved"),
            db=session,
            current_user=admin,
        )
    assert error.value.status_code == 422

    result = contributions.update_contribution(
        contribution.id,
        contributions.ContributionUpdateRequest(
            status="approved", reviewer_native_verified=True,
            audio_quality=4, pronunciation_quality=5, review_comment="Bonne prononciation.",
        ),
        db=session,
        current_user=admin,
    )
    session.refresh(recording)
    assert result["status"] == "approved"
    assert result["publication_status"] == "published"
    assert recording.reviewed_by_id == "7"
    assert recording.reviewer_native_verified is True
    assert recording.audio_quality == 4
    assert recording.pronunciation_quality == 5
    assert recording.review_comment == "Bonne prononciation."
    published = session.query(VocabularyItem).filter_by(source_recording_id=recording.id).one()
    assert published.language_code == "bam"
    assert published.word == "I ni ce"
    assert published.audio_url == f"/api/contributions/recordings/{recording.id}/audio"

    second_result = contributions.update_contribution(
        contribution.id,
        contributions.ContributionUpdateRequest(
            status="approved",
            reviewer_native_verified=True,
            audio_quality=4,
            pronunciation_quality=5,
            review_comment="Bonne prononciation.",
        ),
        db=session,
        current_user=admin,
    )
    assert second_result["publication_status"] == "published"
    assert session.query(VocabularyItem).filter_by(source_recording_id=recording.id).count() == 1


def test_admin_approval_requires_audio_to_be_retrievable_from_private_storage(monkeypatch, contribution_api):
    session, user, prompt, consent = contribution_api
    admin = SimpleNamespace(id=7, role="admin")
    contribution = Contribution(
        language_code="bam", word=prompt.text, translation_fr=prompt.translation_fr,
        status="pending", created_by_id=str(user.id),
    )
    session.add(contribution)
    session.flush()
    recording = VoiceRecording(
        contribution_id=contribution.id, contributor_id=str(user.id), prompt_id=prompt.id,
        consent_id=consent.id, language_code="bam", iso639_3="bam", tts_model_id="facebook/mms-tts-bam",
        variant="standard", storage_key="contributions/41/approval-check.webm", original_mime_type="audio/webm",
        file_extension="webm", size_bytes=20, duration_seconds=2.5, sample_rate_hz=48000,
        channels=1, checksum_sha256="e" * 64, status="pending_native_review",
    )
    session.add(recording)
    session.commit()

    def fail_download(_storage_key):
        raise ContributionStorageError("Audio not found in private storage.")

    monkeypatch.setattr(contributions, "download_audio", fail_download)

    with pytest.raises(HTTPException) as error:
        contributions.update_contribution(
            contribution.id,
            contributions.ContributionUpdateRequest(
                status="approved",
                reviewer_native_verified=True,
                audio_quality=5,
                pronunciation_quality=5,
                review_comment="Examen validé.",
            ),
            db=session,
            current_user=admin,
        )

    assert error.value.status_code == 503
    session.refresh(recording)
    assert recording.status == "pending_native_review"
    assert contribution.status == "pending"


def test_withdraw_consent_withdraws_recordings_and_deletes_private_objects(monkeypatch, contribution_api):
    session, user, prompt, consent = contribution_api
    contribution = Contribution(
        language_code="bam", word=prompt.text, translation_fr=prompt.translation_fr,
        status="pending", created_by_id=str(user.id),
    )
    session.add(contribution)
    session.flush()
    recording = VoiceRecording(
        contribution_id=contribution.id, contributor_id=str(user.id), prompt_id=prompt.id,
        consent_id=consent.id, language_code="bam", iso639_3="bam", tts_model_id="facebook/mms-tts-bam",
        variant="standard", storage_key="contributions/41/withdraw.webm", original_mime_type="audio/webm",
        file_extension="webm", size_bytes=20, duration_seconds=2.5, sample_rate_hz=48000,
        channels=1, checksum_sha256="d" * 64, status="pending_native_review",
    )
    session.add(recording)
    session.commit()
    vocabulary_item = VocabularyItem(
        language_code="bam",
        lesson_number=1,
        word=prompt.text,
        translation_fr=prompt.translation_fr,
        audio_url=f"/api/contributions/recordings/{recording.id}/audio",
        difficulty="approved-contribution",
        source_recording_id=recording.id,
    )
    session.add(vocabulary_item)
    session.commit()
    deleted = []
    monkeypatch.setattr(contributions, "delete_audio", lambda key: deleted.append(key))

    result = contributions.withdraw_contributor_consent(db=session, current_user=user)

    session.refresh(consent)
    session.refresh(recording)
    session.refresh(contribution)
    published_resources = contributions.list_approved_contribution_resources(db=session)
    assert result["status"] == "withdrawn"
    assert consent.withdrawn_at is not None
    assert recording.status == "withdrawn"
    assert recording.publication_status == "withdrawn"
    assert contribution.status == "withdrawn"
    assert session.query(VocabularyItem).filter_by(source_recording_id=recording.id).count() == 0
    assert published_resources == []
    with pytest.raises(HTTPException) as audio_error:
        contributions.get_approved_recording_audio(
            recording.id,
            db=session,
            current_user=user,
        )
    assert audio_error.value.status_code == 404
    assert deleted == ["contributions/41/withdraw.webm"]