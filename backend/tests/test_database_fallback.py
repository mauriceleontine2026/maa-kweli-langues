import importlib

from sqlalchemy import inspect, text


def test_prod_database_without_url_falls_back_to_sqlite(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ENVIRONMENT", raising=False)

    import app.database as database_module

    importlib.reload(database_module)

    assert database_module.DATABASE_URL.startswith("sqlite:///")
    assert database_module.engine is not None


def test_vocabulary_recording_column_is_added_when_missing(monkeypatch):
    monkeypatch.setenv("VERCEL", "1")

    import app.database as database_module
    import app.main as main_module

    importlib.reload(database_module)
    importlib.reload(main_module)

    inspector = inspect(main_module.engine)
    assert "source_recording_id" in {column["name"] for column in inspector.get_columns("vocabulary_items")}

    with main_module.engine.begin() as connection:
        connection.execute(text("DELETE FROM vocabulary_items WHERE id IN (SELECT id FROM vocabulary_items ORDER BY id DESC LIMIT 1)"))
