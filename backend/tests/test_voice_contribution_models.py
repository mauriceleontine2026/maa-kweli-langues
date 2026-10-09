from sqlalchemy import create_engine, inspect

from backend.app.database import Base
from backend.app.models.contribution import Contribution  # noqa: F401
from backend.app.models.language_adapter import LanguageCodeAdapter  # noqa: F401
from backend.app.models.voice_contribution import ContributorConsent, ContributionPrompt, VoiceRecording  # noqa: F401


def test_voice_contribution_tables_are_additive_and_registered():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)

    table_names = set(inspect(engine).get_table_names())

    assert {"contributions", "contributor_consents", "contribution_prompts", "voice_recordings", "language_code_adapters"}.issubset(table_names)