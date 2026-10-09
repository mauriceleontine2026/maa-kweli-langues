from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from ..database import Base


class LanguageCodeAdapter(Base):
    __tablename__ = "language_code_adapters"

    language_code = Column(String(50), ForeignKey("languages.code", ondelete="CASCADE"), primary_key=True)
    iso639_3 = Column(String(3), nullable=False, index=True)
    tts_model_id = Column(String(255), nullable=True)
    verified_by_id = Column(String(255), nullable=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)