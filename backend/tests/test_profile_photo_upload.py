import base64

from app.routers.auth import build_profile_photo_data_url


def test_build_profile_photo_data_url_uses_inline_data_url():
    payload = b"\x89PNG\r\n\x1a\n" + b"0" * 8

    photo_url = build_profile_photo_data_url(payload, "image/png")

    assert photo_url.startswith("data:image/png;base64,")
    assert photo_url == "data:image/png;base64," + base64.b64encode(payload).decode("ascii")
