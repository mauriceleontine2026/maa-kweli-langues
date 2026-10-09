import asyncio
import importlib
from email.utils import parseaddr
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock

import httpx
import pytest
from fastapi import HTTPException

from app.database import SessionLocal
from app.main import app
from app.models.user import User
from app.services.security import ACCESS_TOKEN_COOKIE_NAME


def test_verification_email_uses_ascii_sender_address_with_unicode_brand(monkeypatch):
    auth_module = importlib.import_module("app.routers.auth")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "sender@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM", "Mǎa-kwɛ́lî Langues <sender@example.com>")

    smtp = Mock()
    smtp.__enter__ = Mock(return_value=smtp)
    smtp.__exit__ = Mock(return_value=False)
    monkeypatch.setattr(auth_module.smtplib, "SMTP", Mock(return_value=smtp))

    auth_module._send_verification_email(
        SimpleNamespace(id=1, email="recipient@example.com")
    )

    message = smtp.send_message.call_args.args[0]
    assert parseaddr(str(message["From"]))[1] == "sender@example.com"
    assert "Mǎa-kwɛ́lî Langues" in str(message["From"])


def test_verification_email_rejects_brand_without_verified_sender(monkeypatch):
    auth_module = importlib.import_module("app.routers.auth")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "b64995001@smtp-brevo.com")
    monkeypatch.setenv("SMTP_PASSWORD", "test-password")
    monkeypatch.setenv("SMTP_FROM", "Mǎa-kwɛ́lî Langues")
    smtp_mock = MagicMock()
    monkeypatch.setattr(auth_module.smtplib, "SMTP", smtp_mock)

    with pytest.raises(HTTPException) as error:
        auth_module._send_verification_email(
            SimpleNamespace(id=1, email="recipient@example.com")
        )

    assert error.value.status_code == 503
    assert "SMTP_FROM" in error.value.detail
    smtp_mock.assert_not_called()


def test_verify_email_token_marks_user_as_verified(monkeypatch):
    monkeypatch.delenv("AUTO_VERIFY_ON_MISSING_SMTP", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)

    auth_module = importlib.import_module("app.routers.auth")
    user = SimpleNamespace(
        id="user-1",
        email="test@example.com",
        full_name="Test User",
        role="user",
        email_verified=False,
    )
    db = Mock()
    db.query.return_value.filter.return_value.first.return_value = user

    token = auth_module.security.create_access_token(
        {"sub": "user-1", "email": "test@example.com", "purpose": "email_verification"}
    )

    result = auth_module.verify_email_token(token, db)

    assert result.email_verified is True
    assert result.id == "user-1"
    db.add.assert_called_once_with(user)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(user)


def test_verify_email_creates_authenticated_session():
    auth_module = importlib.import_module("app.routers.auth")
    email = "verify-session@example.com"
    db = SessionLocal()
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            email=email,
            full_name="Test Session User",
            hashed_password="placeholder",
            role="user",
            email_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[auth_module.get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async def run_request():
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            token = auth_module.security.create_access_token(
                {"sub": str(user.id), "email": user.email, "purpose": "email_verification"}
            )
            responses = [
                await client.post("/api/auth/verify-email", json={"resetToken": token})
                for _ in range(7)
            ]
            me_response = await client.get("/api/auth/me")
            return responses, me_response

    try:
        responses, me_response = asyncio.run(run_request())
    finally:
        app.dependency_overrides.pop(auth_module.get_db, None)
        db.delete(user)
        db.commit()
        db.close()

    assert all(response.status_code == 200 for response in responses)
    assert responses[0].json()["user"]["email_verified"] is True
    assert responses[0].cookies.get(ACCESS_TOKEN_COOKIE_NAME) is not None
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email
    assert me_response.json()["id"] == user.id
