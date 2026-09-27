import importlib
import os


def test_prod_database_without_url_falls_back_to_sqlite(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.database as database_module

    importlib.reload(database_module)

    assert database_module.DATABASE_URL.startswith("sqlite:///")
    assert database_module.engine is not None
