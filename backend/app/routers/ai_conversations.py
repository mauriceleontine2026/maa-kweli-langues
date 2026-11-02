from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.ai_conversation import AITutorConversation
from ..services.security import get_current_user

router = APIRouter()

MAX_CONVERSATIONS_PER_USER = 100
MAX_MESSAGES_PER_CONVERSATION = 100
MAX_MESSAGE_LENGTH = 12_000
MAX_CONVERSATION_LENGTH = 60_000


class ConversationMessage(BaseModel):
    role: str
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)

    @model_validator(mode="after")
    def validate_role(self):
        if self.role not in {"user", "assistant"}:
            raise ValueError("Message role must be user or assistant")
        return self


class ConversationPayload(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    language_code: str = Field(min_length=1, max_length=30)
    messages: list[ConversationMessage] = Field(min_length=1, max_length=MAX_MESSAGES_PER_CONVERSATION)
    updated_at: datetime

    @model_validator(mode="after")
    def validate_conversation_size(self):
        if sum(len(message.content) for message in self.messages) > MAX_CONVERSATION_LENGTH:
            raise ValueError("Conversation exceeds the maximum allowed size")
        return self


def _serialize(conversation: AITutorConversation) -> dict:
    updated_at = conversation.updated_at
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return {
        "id": conversation.conversation_id,
        "title": conversation.title,
        "language": conversation.language_code,
        "messages": conversation.messages,
        "updated_at": updated_at.isoformat(),
    }


@router.get("")
def list_conversations(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = (
        db.query(AITutorConversation)
        .filter(AITutorConversation.user_id == str(current_user.id))
        .order_by(AITutorConversation.updated_at.desc())
        .limit(MAX_CONVERSATIONS_PER_USER)
        .all()
    )
    return [_serialize(conversation) for conversation in conversations]


@router.put("/{conversation_id}")
def save_conversation(
    conversation_id: str,
    payload: ConversationPayload,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not conversation_id or len(conversation_id) > 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid conversation ID")

    user_id = str(current_user.id)
    conversation = (
        db.query(AITutorConversation)
        .filter(
            AITutorConversation.user_id == user_id,
            AITutorConversation.conversation_id == conversation_id,
        )
        .first()
    )
    if not conversation:
        conversation_count = db.query(AITutorConversation).filter(AITutorConversation.user_id == user_id).count()
        if conversation_count >= MAX_CONVERSATIONS_PER_USER:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conversation history limit reached")
        conversation = AITutorConversation(user_id=user_id, conversation_id=conversation_id)
        db.add(conversation)

    incoming_updated_at = payload.updated_at.astimezone(timezone.utc).replace(tzinfo=None)
    existing_updated_at = conversation.updated_at
    if existing_updated_at and existing_updated_at.replace(tzinfo=None) > incoming_updated_at:
        db.rollback()
        return _serialize(conversation)

    conversation.title = payload.title
    conversation.language_code = payload.language_code
    conversation.messages = [message.model_dump() for message in payload.messages]
    conversation.updated_at = incoming_updated_at
    db.commit()
    db.refresh(conversation)
    return _serialize(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    conversation = (
        db.query(AITutorConversation)
        .filter(
            AITutorConversation.user_id == str(current_user.id),
            AITutorConversation.conversation_id == conversation_id,
        )
        .first()
    )
    if conversation:
        db.delete(conversation)
        db.commit()
