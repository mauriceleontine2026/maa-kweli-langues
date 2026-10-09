import importlib
from types import SimpleNamespace
from unittest.mock import Mock


def test_verify_email_request_prefers_local_smtp_when_configured(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "user@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example.com")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")

    auth_module = importlib.import_module("app.routers.auth")
    request = Mock()
    payload = SimpleNamespace(email="test@example.com")
    db = Mock()
    current_user = SimpleNamespace(email="test@example.com", id=1)
    db.query.return_value.filter.return_value.first.return_value = current_user

    mock_httpx = Mock()
    monkeypatch.setattr(auth_module.httpx, "post", mock_httpx)
    send_email = Mock()
    monkeypatch.setattr(auth_module, "_send_verification_email", send_email)

    auth_module.request_email_verification(request, payload, db)

    send_email.assert_called_once_with(current_user)
    mock_httpx.assert_not_called()
