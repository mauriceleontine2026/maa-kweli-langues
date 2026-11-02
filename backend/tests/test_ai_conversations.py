import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database import Base, get_db
from backend.app.models.ai_conversation import AITutorConversation  # noqa: F401
from backend.app.routers.ai_conversations import router
from backend.app.services.security import get_current_user


def _create_test_app(test_session, current_user_id):
    app = FastAPI()
    app.include_router(router, prefix="/api/ai-conversations")

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=current_user_id["value"])
    return app


def test_conversation_history_is_persisted_and_scoped_to_user():
    asyncio.run(_test_conversation_history_is_persisted_and_scoped_to_user())


async def _test_conversation_history_is_persisted_and_scoped_to_user():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    current_user_id = {"value": 11}
    app = _create_test_app(test_session, current_user_id)
    conversation_id = "conversation-1"
    updated_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "title": "Salutations",
        "language_code": "sus",
        "messages": [
            {"role": "user", "content": "Comment dire bonjour ?"},
            {"role": "assistant", "content": "Voici une salutation."},
        ],
        "updated_at": updated_at,
    }

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            saved = await client.put(f"/api/ai-conversations/{conversation_id}", json=payload)
            assert saved.status_code == 200
            assert saved.json()["messages"] == payload["messages"]

            assert (await client.get("/api/ai-conversations")).json() == [saved.json()]

            current_user_id["value"] = 22
            assert (await client.get("/api/ai-conversations")).json() == []
            assert (await client.delete(f"/api/ai-conversations/{conversation_id}")).status_code == 204

            current_user_id["value"] = 11
            assert (await client.get("/api/ai-conversations")).json() == [saved.json()]
            assert (await client.delete(f"/api/ai-conversations/{conversation_id}")).status_code == 204
            assert (await client.get("/api/ai-conversations")).json() == []
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_conversation_history_rejects_invalid_messages():
    asyncio.run(_test_conversation_history_rejects_invalid_messages())


async def _test_conversation_history_rejects_invalid_messages():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    app = _create_test_app(test_session, {"value": 11})

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.put(
                "/api/ai-conversations/conversation-1",
                json={
                    "title": "Invalid",
                    "language_code": "sus",
                    "messages": [{"role": "system", "content": "unexpected"}],
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            assert response.status_code == 422
    finally:
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
