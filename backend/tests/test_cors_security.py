import asyncio

import httpx

from backend.app.main import app
from backend.app.services.security import ACCESS_TOKEN_COOKIE_NAME, CSRF_COOKIE_NAME


def test_csrf_rejection_includes_cors_headers_and_exposes_cookie_token():
    frontend_origin = "https://maa-kweli-langues.vercel.app"
    csrf_token = "test-csrf-token"

    async def post_without_csrf():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "invalid-session")
            client.cookies.set(CSRF_COOKIE_NAME, csrf_token)
            return await client.post(
                "/api/ai/chat",
                json={"prompt": "test"},
                headers={"Origin": frontend_origin},
            )

    response = asyncio.run(post_without_csrf())

    assert response.status_code == 403
    assert response.headers["access-control-allow-origin"] == frontend_origin
    assert response.headers["access-control-allow-credentials"] == "true"
    assert response.headers["access-control-expose-headers"] == "Content-Type, X-CSRF-Token"
    assert response.headers["x-csrf-token"] == csrf_token


def test_returned_csrf_token_allows_request_past_csrf_middleware():
    frontend_origin = "https://maa-kweli-langues.vercel.app"
    csrf_token = "test-csrf-token"

    async def post_with_csrf():
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            client.cookies.set(ACCESS_TOKEN_COOKIE_NAME, "invalid-session")
            client.cookies.set(CSRF_COOKIE_NAME, csrf_token)
            return await client.post(
                "/api/ai/chat",
                json={"prompt": "test"},
                headers={"Origin": frontend_origin, "X-CSRF-Token": csrf_token},
            )

    response = asyncio.run(post_with_csrf())

    assert response.status_code == 401
    assert response.headers["x-csrf-token"] == csrf_token