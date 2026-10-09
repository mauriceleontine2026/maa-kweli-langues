import json
import shutil
import wave
import io
from pathlib import Path
from types import SimpleNamespace
from zipfile import ZipFile

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base
from backend.app.models.contribution import Contribution
from backend.app.models.voice_contribution import ContributorConsent, ContributionPrompt, VoiceRecording
from backend.app.services import dataset_export
from backend.app.services.dataset_export import build_dataset_export, select_exportable_recordings


def test_dataset_selection_requires_approval_active_consent_and_matching_scope():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    prompt = ContributionPrompt(
        language_code="bam", text="I ni ce", translation_fr="Bonjour", variant="standard",
        status="approved", native_verified=True, created_by_id="1", approved_by_id="1",
    )
    session.add(prompt)
    session.flush()
    eligible_consent = ContributorConsent(
        contributor_id="11", version="voice-consent-v1", collection_review=True,
        tts_internal=True, public_dataset=True, dataset_license="CC BY 4.0",
    )
    private_consent = ContributorConsent(
        contributor_id="12", version="voice-consent-v1", collection_review=True,
        tts_internal=True, public_dataset=False,
    )
    withdrawn_consent = ContributorConsent(
        contributor_id="13", version="voice-consent-v1", collection_review=True,
        tts_internal=True, public_dataset=True, dataset_license="CC BY 4.0",
        withdrawn_at=__import__("datetime").datetime.utcnow(),
    )
    session.add_all([eligible_consent, private_consent, withdrawn_consent])
    session.flush()

    for index, consent in enumerate([eligible_consent, private_consent, withdrawn_consent], start=1):
        contribution = Contribution(language_code="bam", word="I ni ce", translation_fr="Bonjour", status="approved", created_by_id=consent.contributor_id)
        session.add(contribution)
        session.flush()
        session.add(
            VoiceRecording(
                contribution_id=contribution.id, contributor_id=consent.contributor_id,
                prompt_id=prompt.id, consent_id=consent.id, language_code="bam", iso639_3="bam",
                tts_model_id="facebook/mms-tts-bam", variant="standard",
                storage_key=f"contributions/{index}/recording.webm", original_mime_type="audio/webm",
                file_extension="webm", size_bytes=16, duration_seconds=2, sample_rate_hz=48000,
                channels=1, checksum_sha256=f"{index:064x}", status="approved",
                reviewer_native_verified=True,
            )
        )
    session.commit()

    public_records = select_exportable_recordings(session, "public_dataset")
    internal_records = select_exportable_recordings(session, "internal_tts")

    assert [row[0].contributor_id for row in public_records] == ["11"]
    assert [row[0].contributor_id for row in internal_records] == ["11", "12"]
    session.close()
    engine.dispose()


def test_dataset_export_builds_normalized_archive_and_manifest(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    prompt = ContributionPrompt(
        language_code="bam", text="I ni ce", translation_fr="Bonjour", variant="standard",
        status="approved", native_verified=True, created_by_id="1", approved_by_id="1",
    )
    consent = ContributorConsent(
        contributor_id="11", version="voice-consent-v1", collection_review=True,
        tts_internal=True, public_dataset=True, dataset_license="CC BY 4.0",
    )
    session.add_all([prompt, consent])
    session.flush()
    contribution = Contribution(language_code="bam", word="I ni ce", translation_fr="Bonjour", status="approved", created_by_id="11")
    session.add(contribution)
    session.flush()
    session.add(
        VoiceRecording(
            contribution_id=contribution.id, contributor_id="11", prompt_id=prompt.id,
            consent_id=consent.id, language_code="bam", iso639_3="bam",
            tts_model_id="facebook/mms-tts-bam", variant="standard",
            storage_key="contributions/11/recording.webm", original_mime_type="audio/webm",
            file_extension="webm", size_bytes=20, duration_seconds=2.5, sample_rate_hz=48000,
            channels=1, checksum_sha256="b" * 64, status="approved",
            reviewer_native_verified=True,
        )
    )
    session.commit()
    monkeypatch.setenv("VOICE_DATASET_SPEAKER_SALT", "test-salt")
    monkeypatch.setattr(dataset_export.shutil, "which", lambda _binary: "ffmpeg")
    monkeypatch.setattr(dataset_export, "download_audio", lambda _key: b"source-audio")

    def fake_ffmpeg(command, **_kwargs):
        Path(command[-1]).write_bytes(b"normalized-wav")
        return SimpleNamespace(returncode=0)

    monkeypatch.setattr(dataset_export.subprocess, "run", fake_ffmpeg)
    archive_path, filename = build_dataset_export(session, "public_dataset")
    try:
        with ZipFile(archive_path) as archive:
            names = set(archive.namelist())
            dataset = json.loads(archive.read("dataset.json"))
            manifest = json.loads(archive.read("manifest.jsonl").decode().strip())
            assert f"audio/{contribution.id}.wav" in names
            assert archive.read(f"audio/{contribution.id}.wav") == b"normalized-wav"
            assert dataset["license"] == "CC BY 4.0"
            assert manifest["split"] in {"train", "validation", "test"}
            assert manifest["channels"] == 1
            assert manifest["iso639_3"] == "bam"
            assert manifest["tts_model_id"] == "facebook/mms-tts-bam"
            assert len(manifest["speaker_id"]) == 20
            assert "contributor_id" not in manifest
        assert filename.endswith(".zip")
    finally:
        shutil.rmtree(Path(archive_path).parent, ignore_errors=True)
        session.close()
        engine.dispose()


def test_audio_normalization_uses_pyav_when_ffmpeg_is_unavailable(monkeypatch, tmp_path):
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, "wb") as audio_file:
        audio_file.setparams((2, 2, 44100, 44100, "NONE", "not compressed"))
        audio_file.writeframes(b"\x00\x00\x00\x00" * 44100)
    monkeypatch.setattr(dataset_export.shutil, "which", lambda _binary: None)
    destination = tmp_path / "normalized.wav"

    dataset_export._normalize_audio(audio_buffer.getvalue(), "wav", destination)

    with wave.open(str(destination), "rb") as normalized:
        assert normalized.getnchannels() == 1
        assert normalized.getframerate() == 22050
        assert normalized.getsampwidth() == 2