import importlib
from types import SimpleNamespace
from unittest.mock import Mock


def test_auto_verify_defaults_to_true_when_smtp_missing(monkeypatch):
    monkeypatch.delenv("AUTO_VERIFY_ON_MISSING_SMTP", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)

    auth_module = importlib.import_module("app.routers.auth")

    assert auth_module._should_auto_verify_when_smtp_unavailable() is True


def test_auto_verify_marks_existing_unverified_user(monkeypatch):
    monkeypatch.delenv("AUTO_VERIFY_ON_MISSING_SMTP", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.delenv("SMTP_PASSWORD", raising=False)

    auth_module = importlib.import_module("app.routers.auth")
    user = SimpleNamespace(email_verified=False)
    db = Mock()

    assert auth_module._auto_verify_user_if_needed(user, db) is True
    assert user.email_verified is True
    db.add.assert_called_once_with(user)
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(user)
