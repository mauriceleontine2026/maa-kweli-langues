import importlib
from unittest.mock import Mock

import pytest
from fastapi import HTTPException, Response
from pydantic import ValidationError


def test_login_request_rejects_password_shorter_than_12_characters():
    auth_module = importlib.import_module("app.routers.auth")

    with pytest.raises(ValidationError):
        auth_module.LoginRequest(email="person@example.com", password="Short123!x")


def test_form_login_rejects_password_shorter_than_12_characters(monkeypatch):
    auth_module = importlib.import_module("app.routers.auth")
    monkeypatch.setattr(auth_module, "_check_rate_limit", lambda request: None)

    with pytest.raises(HTTPException) as error:
        auth_module.login_form(
            request=object(),
            response=Response(),
            email="person@example.com",
            password="Short123!x",
            db=Mock(),
        )

    assert error.value.status_code == 422