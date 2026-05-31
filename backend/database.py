import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Önce proje kökündeki .env, sonra backend/.env okunur.
# backend/.env varsa daha özel kabul edilir.
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env", override=True)

DEFAULT_SQLITE_PATH = BASE_DIR / "kelime_ezberleme.db"


def normalize_database_url(database_url: str) -> str:
    if not database_url.startswith("sqlite:///") or database_url == "sqlite:///:memory":
        return database_url

    sqlite_path = database_url.replace("sqlite:///", "", 1)

    # sqlite:///./kelime_ezberleme.db gibi relative pathler her çalıştırma
    # klasöründe farklı yere gitmesin; backend klasörüne sabitlenir.
    if sqlite_path.startswith("/") or Path(sqlite_path).is_absolute():
        return database_url

    return f"sqlite:///{(BASE_DIR / sqlite_path).resolve().as_posix()}"


SQLALCHEMY_DATABASE_URL = normalize_database_url(
    os.getenv(
        "DATABASE_URL",
        f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}",
    )
)

connect_args = (
    {"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
