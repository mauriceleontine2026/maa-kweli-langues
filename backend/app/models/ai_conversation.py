from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, JSON, String, UniqueConstraint

from ..database import Base


class AITutorConversation(Base):
    __tablename__ = "ai_tutor_conversations"
    __table_args__ = (
        UniqueConstraint("user_id", "conversation_id", name="uq_ai_tutor_conversation_user_id"),
        Index("ix_ai_tutor_conversations_user_updated", "user_id", "updated_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    conversation_id = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    language_code = Column(String(30), nullable=False)
    messages = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
