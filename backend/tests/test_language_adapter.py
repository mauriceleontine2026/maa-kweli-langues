from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base
from backend.app.models.language import Language
from backend.app.models.language_adapter import LanguageCodeAdapter
from backend.app.routers.languages import LanguageCodeAdapterRequest, save_language_code_adapter


def test_language_adapter_request_validates_registered_iso639_3():
    assert LanguageCodeAdapterRequest(iso639_3="bam").iso639_3 == "bam"
    with pytest.raises(ValidationError):
        LanguageCodeAdapterRequest(iso639_3="xyz")


def test_admin_can_save_iso_and_tts_model_separately():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    session.add(Language(code="bam", name="Bambara", name_fr="Bambara"))
    session.commit()

    result = save_language_code_adapter(
        "bam",
        LanguageCodeAdapterRequest(iso639_3="bam", tts_model_id="facebook/mms-tts-bam"),
        db=session,
        current_user=SimpleNamespace(id=7),
    )

    adapter = session.query(LanguageCodeAdapter).one()
    assert result == {"language_code": "bam", "iso639_3": "bam", "tts_model_id": "facebook/mms-tts-bam"}
    assert adapter.verified_by_id == "7"
    session.close()
    engine.dispose()


def test_language_adapter_rejects_unknown_application_language():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()

    with pytest.raises(HTTPException) as error:
        save_language_code_adapter(
            "unknown",
            LanguageCodeAdapterRequest(iso639_3="bam"),
            db=session,
            current_user=SimpleNamespace(id=7),
        )

    assert error.value.status_code == 404
    session.close()
    engine.dispose()