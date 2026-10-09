from app.routers.languages import normalize_language_text


def test_normalize_language_text_restores_utf8_mojibake():
    assert normalize_language_text("BadiarankÃ©") == "Badiaranké"
    assert normalize_language_text("EspaÃ±ol") == "Español"
    assert normalize_language_text("FranÃ§ais") == "Français"


def test_normalize_language_text_preserves_valid_text():
    assert normalize_language_text("Bassa-ri") == "Bassa-ri"
    assert normalize_language_text("Badiaranké") == "Badiaranké"
