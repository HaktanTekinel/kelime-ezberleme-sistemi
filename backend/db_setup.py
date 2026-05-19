from __future__ import annotations

import csv
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path

from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

import models
from database import SessionLocal

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
WORD_SEED_CSV = ROOT_DIR / "database" / "word_seed_final_samples.csv"

ID_TABLES = [
    "users",
    "user_settings",
    "words",
    "word_samples",
    "user_word_progress",
    "quiz_sessions",
    "quiz_answers",
    "password_reset_tokens",
    "report_snapshots",
    "wordle_games",
    "wordle_guesses",
    "word_chain_stories",
]


def is_sqlite(engine: Engine) -> bool:
    return engine.url.get_backend_name() == "sqlite"


def get_sqlite_path(engine: Engine) -> Path | None:
    database = engine.url.database
    if not database or database == ":memory":
        return None
    return Path(database).resolve()


def table_exists(cursor: sqlite3.Cursor, table_name: str) -> bool:
    cursor.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def has_sqlite_autoincrement_id(cursor: sqlite3.Cursor, table_name: str) -> bool:
    if not table_exists(cursor, table_name):
        return True

    cursor.execute(f"PRAGMA table_info({table_name})")
    for column in cursor.fetchall():
        # cid, name, type, notnull, dflt_value, pk
        _cid, name, column_type, _notnull, _default, primary_key = column
        if name == "id":
            return primary_key == 1 and str(column_type).upper() == "INTEGER"

    return True


def reset_broken_sqlite_database_if_needed(engine: Engine) -> None:
    """
    Eski kod SQLite üzerinde BIGINT PRIMARY KEY üretmişse otomatik id çalışmaz.
    Bu durumda register/quiz/settings 500 verir. Lokal geliştirme DB'si yedeklenip
    yeniden oluşturulur. PostgreSQL'e dokunmaz.
    """
    if not is_sqlite(engine):
        return

    db_path = get_sqlite_path(engine)
    if not db_path or not db_path.exists():
        return

    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()

    try:
        broken_tables = [
            table_name
            for table_name in ID_TABLES
            if not has_sqlite_autoincrement_id(cursor, table_name)
        ]
    finally:
        connection.close()

    if not broken_tables:
        return

    engine.dispose()
    backup_path = db_path.with_name(
        f"{db_path.stem}.broken-{datetime.now().strftime('%Y%m%d%H%M%S')}{db_path.suffix}"
    )
    shutil.copy2(db_path, backup_path)
    db_path.unlink()
    print(
        "SQLite şeması eski olduğu için DB yenilendi. "
        f"Yedek: {backup_path.name}; sorunlu tablolar: {', '.join(broken_tables)}"
    )


def normalize_difficulty(row: dict, row_index: int) -> int:
    raw_value = (row.get("difficulty_level") or "").strip()
    if raw_value.isdigit():
        return min(max(int(raw_value), 1), 10)

    # Eski CSV sadece CEFR level içeriyordu. Yedek dönüşüm.
    cefr = (row.get("level") or "").strip().upper()
    fallback_map = {
        "A1": 1,
        "A2": 3,
        "B1": 5,
        "B2": 7,
        "C1": 9,
        "C2": 10,
    }

    if cefr in fallback_map:
        return fallback_map[cefr]

    return (row_index % 10) + 1


def clean_text(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def upsert_word_from_row(db: Session, row: dict, row_index: int) -> bool:
    eng_word = clean_text(row.get("eng_word"))
    tur_word = clean_text(row.get("tur_word"))

    if not eng_word or not tur_word:
        return False

    word = (
        db.query(models.Word)
        .filter(models.Word.eng_word.ilike(eng_word))
        .first()
    )

    difficulty_level = normalize_difficulty(row, row_index)
    topic = clean_text(row.get("topic")) or clean_text(row.get("level")) or "Genel"

    if not word:
        word = models.Word(
            eng_word=eng_word,
            tur_word=tur_word,
            difficulty_level=difficulty_level,
            topic=topic,
            picture_url=clean_text(row.get("picture")),
            audio_url=clean_text(row.get("audio_url")),
            is_active=True,
        )
        db.add(word)
        db.flush()
    else:
        word.tur_word = tur_word
        word.difficulty_level = difficulty_level
        word.topic = topic
        word.picture_url = clean_text(row.get("picture")) or word.picture_url
        word.audio_url = clean_text(row.get("audio_url")) or word.audio_url
        word.is_active = True

    samples = [
        clean_text(row.get("sample_sentence_1")),
        clean_text(row.get("sample_sentence_2")),
    ]

    for sample_order, sample_text in enumerate(samples, start=1):
        if not sample_text:
            continue

        exists = (
            db.query(models.WordSample)
            .filter(models.WordSample.word_id == word.id)
            .filter(models.WordSample.sample_text == sample_text)
            .first()
        )

        if not exists:
            db.add(
                models.WordSample(
                    word_id=word.id,
                    sample_text=sample_text,
                    sample_order=sample_order,
                )
            )

    return True


def seed_words_from_csv() -> None:
    if not WORD_SEED_CSV.exists():
        print(f"Kelime CSV bulunamadı: {WORD_SEED_CSV}")
        return

    db = SessionLocal()

    try:
        with WORD_SEED_CSV.open("r", encoding="utf-8-sig", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            changed_count = 0

            for row_index, row in enumerate(reader):
                if upsert_word_from_row(db, row, row_index):
                    changed_count += 1

        db.commit()
        print(f"Kelime seed kontrolü tamamlandı. İşlenen kelime: {changed_count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def initialize_database(engine: Engine) -> None:
    reset_broken_sqlite_database_if_needed(engine)
    models.Base.metadata.create_all(bind=engine)
    seed_words_from_csv()

    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    missing_tables = {table for table in ID_TABLES if table not in table_names}

    if missing_tables:
        print(f"Eksik tablo uyarısı: {', '.join(sorted(missing_tables))}")
