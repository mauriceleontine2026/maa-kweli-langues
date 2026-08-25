import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# Load root .env file first, then `.env.production`, then `.env.local`, then fallback to backend/.env if needed.
root_env = Path(__file__).resolve().parents[2] / ".env"
root_env_production = Path(__file__).resolve().parents[2] / ".env.production"
root_env_local = Path(__file__).resolve().parents[2] / ".env.local"
backend_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=root_env, override=False)
load_dotenv(dotenv_path=root_env_production, override=False)
load_dotenv(dotenv_path=root_env_local, override=False)
load_dotenv(dotenv_path=backend_env, override=False)


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def _build_engine(url: str):
    connect_args = {"check_same_thread": False} if _is_sqlite(url) else {}
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


ROOT_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = ROOT_DIR / "mbaara.db"
if os.getenv("VERCEL") == "1":
    DEFAULT_DB_PATH = Path("/tmp") / "mbaara.db"

if os.getenv("DATABASE_URL"):
    DATABASE_URL = os.getenv("DATABASE_URL")
else:
    if os.getenv("VERCEL") == "1" or os.getenv("ENVIRONMENT", "").lower() in {"production", "prod"}:
        raise RuntimeError("DATABASE_URL must be configured in production.")
    write_dir = ROOT_DIR if os.access(ROOT_DIR, os.W_OK) else Path("/tmp")
    DEFAULT_DB_PATH = write_dir / "mbaara.db"
    DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

try:
    if _is_sqlite(DATABASE_URL):
        engine = _build_engine(DATABASE_URL)
    else:
        engine = _build_engine(DATABASE_URL)
        with engine.connect() as conn:  # type: ignore[attr-defined]
            conn.execute(text("SELECT 1"))
except Exception as exc:  # noqa: BLE001
    if os.getenv("VERCEL") == "1" or os.getenv("ENVIRONMENT", "").lower() in {"production", "prod"}:
        raise RuntimeError("Configured production database is unavailable.") from exc
    fallback_path = Path("/tmp") / "mbaara.db"
    fallback_url = f"sqlite:///{fallback_path}"
    logger.warning(
        "Could not connect to DATABASE_URL %s; falling back to %s. Error: %s",
        DATABASE_URL,
        fallback_url,
        exc,
    )
    DATABASE_URL = fallback_url
    engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
