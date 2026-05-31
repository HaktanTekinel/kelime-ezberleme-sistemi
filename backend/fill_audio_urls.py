from __future__ import annotations

import csv
import json
import sqlite3
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(__file__).resolve().parent

CSV_PATH = PROJECT_ROOT / "database" / "word_seed_final_samples.csv"
SQL_OUTPUT_PATH = PROJECT_ROOT / "database" / "update_audio_urls.sql"
SQLITE_DB_PATH = BACKEND_DIR / "kelime_ezberleme.db"

API_URL_TEMPLATE = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}"

REQUEST_DELAY_SECONDS = 0.25
SAVE_EVERY = 25


def normalize_audio_url(audio_url: str | None) -> str:
    if not audio_url:
        return ""

    audio_url = audio_url.strip()

    if audio_url.startswith("//"):
        return f"https:{audio_url}"

    return audio_url


def fetch_audio_url(word: str) -> str:
    safe_word = quote(word.strip().lower())
    api_url = API_URL_TEMPLATE.format(word=safe_word)

    request = Request(
        api_url,
        headers={
            "User-Agent": "kelime-ezberleme-sistemi/1.0",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return ""

    if not isinstance(data, list):
        return ""

    for entry in data:
        phonetics = entry.get("phonetics", [])

        if not isinstance(phonetics, list):
            continue

        for phonetic in phonetics:
            audio_url = normalize_audio_url(phonetic.get("audio"))

            if audio_url:
                return audio_url

    return ""


def read_words_csv() -> list[dict[str, str]]:
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV bulunamadı: {CSV_PATH}")

    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return list(reader)


def write_words_csv(rows: list[dict[str, str]]) -> None:
    if not rows:
        return

    fieldnames = list(rows[0].keys())

    if "audio_url" not in fieldnames:
        fieldnames.append("audio_url")

    with CSV_PATH.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def escape_sql(value: str) -> str:
    return value.replace("'", "''")


def write_update_sql(rows: list[dict[str, str]]) -> None:
    updated_rows = [
        row
        for row in rows
        if row.get("eng_word", "").strip() and row.get("audio_url", "").strip()
    ]

    lines = [
        "-- Bu dosya fill_audio_urls.py tarafından üretildi.",
        "-- Kelimelerin telaffuz linklerini words.audio_url alanına işler.",
        "",
    ]

    for row in updated_rows:
        eng_word = escape_sql(row["eng_word"].strip())
        audio_url = escape_sql(row["audio_url"].strip())

        lines.append(
            f"UPDATE words SET audio_url = '{audio_url}' "
            f"WHERE LOWER(eng_word) = LOWER('{eng_word}');"
        )

    SQL_OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def update_sqlite_database(rows: list[dict[str, str]]) -> int:
    if not SQLITE_DB_PATH.exists():
        print(f"SQLite DB bulunamadı, sadece CSV ve SQL üretildi: {SQLITE_DB_PATH}")
        return 0

    updated_pairs = [
        (row.get("audio_url", "").strip(), row.get("eng_word", "").strip())
        for row in rows
        if row.get("audio_url", "").strip() and row.get("eng_word", "").strip()
    ]

    if not updated_pairs:
        return 0

    connection = sqlite3.connect(SQLITE_DB_PATH)

    try:
        cursor = connection.cursor()

        cursor.executemany(
            """
            UPDATE words
            SET audio_url = ?
            WHERE LOWER(eng_word) = LOWER(?)
            """,
            updated_pairs,
        )

        connection.commit()
        return cursor.rowcount
    finally:
        connection.close()


def main() -> None:
    rows = read_words_csv()

    total_count = len(rows)
    filled_before_count = sum(1 for row in rows if row.get("audio_url", "").strip())

    print(f"Toplam kelime: {total_count}")
    print(f"Önceden audio_url dolu olan: {filled_before_count}")
    print("Telaffuz linkleri aranıyor...")

    found_count = 0
    missing_count = 0

    for index, row in enumerate(rows, start=1):
        eng_word = row.get("eng_word", "").strip()

        if not eng_word:
            missing_count += 1
            continue

        if row.get("audio_url", "").strip():
            continue

        audio_url = fetch_audio_url(eng_word)

        if audio_url:
            row["audio_url"] = audio_url
            found_count += 1
            print(f"[{index}/{total_count}] OK  - {eng_word}")
        else:
            row["audio_url"] = ""
            missing_count += 1
            print(f"[{index}/{total_count}] YOK - {eng_word}")

        if index % SAVE_EVERY == 0:
            write_words_csv(rows)
            write_update_sql(rows)
            print("Ara kayıt alındı.")

        time.sleep(REQUEST_DELAY_SECONDS)

    write_words_csv(rows)
    write_update_sql(rows)

    sqlite_updated_count = update_sqlite_database(rows)

    filled_after_count = sum(1 for row in rows if row.get("audio_url", "").strip())

    print("")
    print("İşlem tamamlandı.")
    print(f"Yeni bulunan audio_url: {found_count}")
    print(f"Bulunamayan kelime: {missing_count}")
    print(f"CSV içinde toplam dolu audio_url: {filled_after_count}")
    print(f"Üretilen SQL dosyası: {SQL_OUTPUT_PATH}")
    print(f"SQLite güncellenen satır sayısı: {sqlite_updated_count}")


if __name__ == "__main__":
    main()