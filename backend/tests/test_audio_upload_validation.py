import pytest

from backend.app.routers.audio import validate_audio_upload_bytes


def test_validate_audio_upload_accepts_standard_m4a_container_header():
    contents = b"\x00\x00\x00\x18ftypM4A " + b"\x00" * 8

    assert validate_audio_upload_bytes("contribution.m4a", contents) == ".m4a"


def test_validate_audio_upload_rejects_invalid_m4a_container_header():
    with pytest.raises(ValueError, match="Invalid M4A/AAC header"):
        validate_audio_upload_bytes("contribution.m4a", b"\x00" * 20)