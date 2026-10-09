from sqlalchemy import Column, Integer, String, Text, DateTime
from ..database import Base
from datetime import datetime


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"

    id = Column(Integer, primary_key=True, index=True)
    language_code = Column(String(50), nullable=False, index=True)
    lesson_number = Column(Integer, default=1, index=True)
    word = Column(String(255), nullable=False)
    translation_fr = Column(String(255), nullable=True)
    phonetic = Column(String(255), nullable=True)
    example_target = Column(Text, nullable=True)
    example_fr = Column(Text, nullable=True)
    audio_url = Column(String(1024), nullable=True)
    difficulty = Column(String(50), nullable=True)
    source_recording_id = Column(Integer, nullable=True, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
