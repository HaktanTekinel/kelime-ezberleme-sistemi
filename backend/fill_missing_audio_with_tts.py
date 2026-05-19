from __future__ import annotations

import csv
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from gtts import gTTS
from sqlalchemy import text

from database import engine


load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(__file__).resolve().parent

CSV_PATH = PROJECT_ROOT / "database" / "word_seed_final_samples.csv"
SQL_OUTPUT_PATH = PROJECT_ROOT / "database" / "update_missing_audio_urls.sql"

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = BACKEND_DIR / UPLOAD_DIR

UPLOAD_DIR = UPLOAD_DIR.resolve()
AUDIO_DIR = UPLOAD_DIR / "audio" / "words"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

PUBLIC_AUDIO_PREFIX = "/uploads/audio/words"

WORD_COLUMN_CANDIDATES = [
    "eng_word",
    "eng_word_name",
    "engWord",
    "engWordName",
    "EngWordName",
]


def get_word_column(fieldnames: list[str]) -> str:
    for column_name in WORD_COLUMN_CANDIDATES:
        if column_name in fieldnames:
            return column_name

    raise ValueError(
        "CSV içinde İngilizce kelime kolonu bulunamadı. "
        "Beklenen kolonlardan biri: eng_word, eng_word_name, engWord"
    )


def ensure_audio_column(fieldnames: list[str]) -> list[str]:
    if "audio_url" in fieldnames:
        return fieldnames

    return [*fieldnames, "audio_url"]


def read_csv_rows() -> tuple[list[dict[str, str]], list[str], str]:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV bulunamadı: {CSV_PATH}")

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        fieldnames = ensure_audio_column(list(reader.fieldnames or []))
        word_column = get_word_column(fieldnames)
        rows = list(reader)

    for row in rows:
        row.setdefault("audio_url", "")

    return rows, fieldnames, word_column


def write_csv_rows(rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def slugify_word(word: str) -> str:
    clean_word = word.strip().lower()
    clean_word = re.sub(r"[^a-z0-9]+", "_", clean_word)
    clean_word = clean_word.strip("_")

    if not clean_word:
        clean_word = "word"

    return clean_word


def get_audio_file_path(word: str) -> Path:
    return AUDIO_DIR / f"{slugify_word(word)}.mp3"


def get_public_audio_url(word: str) -> str:
    return f"{PUBLIC_AUDIO_PREFIX}/{slugify_word(word)}.mp3"


def generate_tts_audio(word: str) -> str:
    audio_file_path = get_audio_file_path(word)
    public_audio_url = get_public_audio_url(word)

    if audio_file_path.exists() and audio_file_path.stat().st_size > 0:
        return public_audio_url

    tts = gTTS(text=word, lang="en", slow=False)
    tts.save(str(audio_file_path))

    if audio_file_path.exists() and audio_file_path.stat().st_size > 0:
        return public_audio_url

    return ""


def escape_sql(value: str) -> str:
    return value.replace("'", "''")


def write_update_sql(rows: list[dict[str, str]], word_column: str) -> None:
    lines = [
        "-- Bu dosya fill_missing_audio_with_tts.py tarafından üretildi.",
        "-- Eksik telaffuz dosyalarını words.audio_url alanına işler.",
        "",
    ]

    for row in rows:
        word = row.get(word_column, "").strip()
        audio_url = row.get("audio_url", "").strip()

        if not word or not audio_url:
            continue

        lines.append(
            "UPDATE words "
            f"SET audio_url = '{escape_sql(audio_url)}' "
            f"WHERE LOWER(eng_word) = LOWER('{escape_sql(word)}');"
        )

    SQL_OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_database(rows: list[dict[str, str]], word_column: str) -> int:
    update_items = [
        {
            "audio_url": row.get("audio_url", "").strip(),
            "eng_word": row.get(word_column, "").strip(),
        }
        for row in rows
        if row.get("audio_url", "").strip() and row.get(word_column, "").strip()
    ]

    if not update_items:
        return 0

    with engine.begin() as connection:
        result = connection.execute(
            text(
                """
                UPDATE words
                SET audio_url = :audio_url
                WHERE LOWER(eng_word) = LOWER(:eng_word)
                """
            ),
            update_items,
        )

    return result.rowcount or 0


def main() -> None:
    rows, fieldnames, word_column = read_csv_rows()

    missing_rows = [
        row
        for row in rows
        if row.get(word_column, "").strip()
        and not row.get("audio_url", "").strip()
    ]

    print(f"CSV dosyası: {CSV_PATH}")
    print(f"Ses dosyası klasörü: {AUDIO_DIR}")
    print(f"Toplam kelime: {len(rows)}")
    print(f"Eksik audio_url sayısı: {len(missing_rows)}")
    print("Eksik telaffuz dosyaları üretiliyor...")
    print("")

    generated_count = 0
    failed_count = 0

    for index, row in enumerate(missing_rows, start=1):
        word = row.get(word_column, "").strip()

        try:
            audio_url = generate_tts_audio(word)
        except Exception as error:
            audio_url = ""
            print(f"[{index}/{len(missing_rows)}] HATA - {word} | {error}")

        if audio_url:
            row["audio_url"] = audio_url
            generated_count += 1
            print(f"[{index}/{len(missing_rows)}] OK   - {word} -> {audio_url}")
        else:
            failed_count += 1
            print(f"[{index}/{len(missing_rows)}] YOK  - {word}")

        if index % 25 == 0:
            write_csv_rows(rows, fieldnames)
            write_update_sql(rows, word_column)
            updated_count = update_database(rows, word_column)
            print(f"Ara kayıt alındı. DB güncellenen satır: {updated_count}")
            print("")

    write_csv_rows(rows, fieldnames)
    write_update_sql(rows, word_column)
    updated_count = update_database(rows, word_column)

    filled_audio_count = sum(
        1 for row in rows if row.get("audio_url", "").strip()
    )
    still_missing_count = sum(
        1
        for row in rows
        if row.get(word_column, "").strip()
        and not row.get("audio_url", "").strip()
    )

    print("")
    print("İşlem tamamlandı.")
    print(f"Yeni üretilen MP3: {generated_count}")
    print(f"Üretilemeyen: {failed_count}")
    print(f"CSV içinde toplam dolu audio_url: {filled_audio_count}")
    print(f"Hâlâ eksik audio_url: {still_missing_count}")
    print(f"Üretilen SQL dosyası: {SQL_OUTPUT_PATH}")
    print(f"DB güncellenen satır sayısı: {updated_count}")
    print("")
    print("Örnek test URL:")
    print("http://127.0.0.1:8000/uploads/audio/words/zoology.mp3")


if __name__ == "__main__":
    main()