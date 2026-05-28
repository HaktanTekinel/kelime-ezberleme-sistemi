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
    cefr = (row.get("level") or "").strip().upper()
    fallback_map = {
        "A1": 1,
        "A2": 2,
        "B1": 3,
        "B2": 4,
        "C1": 5,
        "C2": 6,
    }

    if cefr in fallback_map:
        return fallback_map[cefr]

    raw_value = (row.get("difficulty_level") or "").strip()
    if raw_value.isdigit():
        return min(max(int(raw_value), 1), 6)

    return (row_index % 6) + 1


TOPIC_KEYWORDS = {
    "Hayvanlar": (
        "animal", "animals", "bear", "bird", "cat", "dog", "fish", "horse", "lion", "monkey", "rabbit", "tiger", "wolf", "zebra", "zoo", "zoology", "zoologist",
        "hayvan", "kuş", "kedi", "köpek", "balık", "at", "aslan", "kaplan", "kurt", "ayı", "zebra", "zooloji", "zoolog"
    ),
    "Yiyecek ve İçecek": (
        "apple", "banana", "bread", "cake", "candy", "cheese", "chicken", "coffee", "drink", "eat", "egg", "food", "fruit", "garlic", "juice", "meal", "milk", "onion", "orange", "pancake", "papaya", "rice", "salad", "salmon", "sausage", "tea", "vegetable", "walnut", "water",
        "elma", "muz", "ekmek", "pasta", "şeker", "peynir", "tavuk", "kahve", "içecek", "yemek", "yumurta", "meyve", "sarımsak", "süt", "soğan", "portakal", "salata", "çay", "sebze", "ceviz", "su"
    ),
    "Doğa": (
        "air", "beach", "cloud", "dark", "earth", "ecology", "ecological", "flower", "forest", "garden", "grass", "hill", "island", "lake", "land", "leaf", "mountain", "nature", "ocean", "plant", "rain", "river", "sea", "sky", "snow", "tree", "weather", "wind",
        "hava", "plaj", "bulut", "dünya", "çiçek", "orman", "bahçe", "çim", "tepe", "ada", "göl", "dağ", "doğa", "okyanus", "bitki", "yağmur", "nehir", "deniz", "gökyüzü", "kar", "ağaç", "rüzgar"
    ),
    "Eğitim": (
        "answer", "book", "campus", "class", "course", "education", "educational", "exam", "homework", "language", "learn", "lesson", "library", "page", "pen", "read", "school", "student", "study", "teacher", "test", "university", "vocabulary", "write",
        "cevap", "kitap", "kampüs", "sınıf", "kurs", "eğitim", "sınav", "ödev", "dil", "öğren", "ders", "kütüphane", "sayfa", "kalem", "oku", "okul", "öğrenci", "çalış", "öğretmen", "üniversite", "kelime", "yaz"
    ),
    "İş Dünyası": (
        "account", "agreement", "business", "career", "company", "customer", "deal", "employee", "factory", "job", "manager", "meeting", "occupation", "office", "project", "report", "salary", "sale", "service", "team", "work", "worker",
        "hesap", "anlaşma", "iş", "kariyer", "şirket", "müşteri", "çalışan", "fabrika", "meslek", "ofis", "proje", "rapor", "maaş", "satış", "hizmet", "takım"
    ),
    "Teknoloji": (
        "app", "camera", "computer", "data", "device", "digital", "email", "internet", "keyboard", "laptop", "message", "online", "phone", "robot", "screen", "software", "system", "technology", "video", "website",
        "uygulama", "kamera", "bilgisayar", "veri", "cihaz", "dijital", "e-posta", "internet", "klavye", "laptop", "mesaj", "çevrim", "telefon", "robot", "ekran", "yazılım", "sistem", "teknoloji", "video", "web"
    ),
    "Sağlık": (
        "back", "body", "doctor", "exercise", "fatigue", "health", "heart", "hospital", "ill", "medicine", "neck", "pain", "pandemic", "patient", "sleep", "sport", "strong", "tired", "walk",
        "vücut", "doktor", "egzersiz", "sağlık", "kalp", "hastane", "hasta", "ilaç", "boyun", "ağrı", "pandemi", "uyku", "spor", "güçlü", "yorgun", "yürü"
    ),
    "Seyahat": (
        "airport", "arrive", "bus", "car", "carrier", "ecotourism", "flight", "hotel", "journey", "map", "passport", "plane", "road", "station", "taxi", "ticket", "tour", "train", "travel", "trip", "vacation", "visit",
        "havaalanı", "varmak", "otobüs", "araba", "uçuş", "otel", "yolculuk", "harita", "pasaport", "uçak", "yol", "istasyon", "taksi", "bilet", "tur", "tren", "seyahat", "gezi", "tatil", "ziyaret"
    ),
    "Duygular": (
        "afraid", "angry", "bored", "calm", "cry", "emotion", "excited", "fear", "feel", "glad", "happy", "happiness", "hope", "laugh", "love", "sad", "smile", "surprise", "worry",
        "kork", "kızgın", "sıkılmış", "sakin", "ağla", "duygu", "heyecan", "mutlu", "umut", "gül", "sevgi", "üzgün", "gülümse", "şaş", "endişe"
    ),
    "Davranış ve Kişilik": (
        "action", "activity", "active", "bad", "badly", "brave", "careful", "clever", "easily", "friendly", "hardly", "honest", "kind", "kindly", "lazy", "noble", "polite", "quiet", "rude", "serious", "shy", "smart", "wordsmith",
        "davranış", "eylem", "aktif", "kötü", "cesur", "dikkatli", "zeki", "kolayca", "dostça", "dürüst", "nazik", "tembel", "soylu", "kibar", "sessiz", "kaba", "ciddi", "utangaç"
    ),
    "Sanat ve Kültür": (
        "actor", "art", "artist", "cinema", "culture", "dance", "dancing", "film", "magazine", "movie", "music", "paint", "painting", "picture", "song", "story", "theatre", "writer",
        "aktör", "sanat", "sanatçı", "sinema", "kültür", "dans", "film", "dergi", "müzik", "boya", "resim", "şarkı", "hikaye", "tiyatro", "yazar"
    ),
    "Bilim": (
        "biology", "calculation", "calculate", "chemistry", "economics", "energy", "experiment", "gravity", "history", "laboratory", "math", "physics", "research", "science", "space",
        "biyoloji", "hesaplama", "kimya", "ekonomi", "enerji", "deney", "yerçekimi", "tarih", "laboratuvar", "matematik", "fizik", "araştırma", "bilim", "uzay"
    ),
    "Günlük Yaşam": (
        "about", "above", "address", "after", "afternoon", "again", "always", "baby", "bag", "ball", "bar", "baseball", "basketball", "bed", "breakfast", "call", "card", "cash", "city", "dad", "daddy", "date", "day", "door", "ear", "early", "face", "family", "farm", "farmer", "gift", "girl", "girlfriend", "hair", "haircut", "hand", "home", "house", "jacket", "jeans", "kitchen", "lunch", "market", "money", "morning", "name", "night", "pants", "room", "shop", "street", "time", "today", "tomorrow", "waiter", "wall", "yes",
        "hakkında", "yukarı", "adres", "sonra", "öğleden", "bebek", "çanta", "top", "yatak", "kahvaltı", "ara", "kart", "nakit", "şehir", "baba", "tarih", "gün", "kapı", "kulak", "erken", "yüz", "aile", "çiftlik", "hediye", "kız", "saç", "el", "ev", "ceket", "kot", "mutfak", "öğle", "market", "para", "sabah", "isim", "gece", "pantolon", "oda", "mağaza", "sokak", "zaman", "bugün", "yarın", "garson", "duvar", "evet"
    ),
}
ORDER = list(TOPIC_KEYWORDS)


def tokenize_topic_text(row: dict) -> set[str]:
    normalized = []
    text = f"{row.get('eng_word', '')} {row.get('tur_word', '')}".lower()

    for char in text:
        normalized.append(char if char.isalnum() else " ")

    return set("".join(normalized).split())


def has_topic_keyword(text: str, tokens: set[str], keyword: str) -> bool:
    if len(keyword) <= 4:
        return keyword in tokens

    return keyword in text


def infer_topic(row: dict) -> str:
    text = f"{row.get('eng_word', '')} {row.get('tur_word', '')}".lower()
    tokens = tokenize_topic_text(row)

    for topic in ORDER:
        if any(has_topic_keyword(text, tokens, keyword) for keyword in TOPIC_KEYWORDS[topic]):
            return topic

    return "Genel"

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
    topic = clean_text(row.get("topic")) or infer_topic(row)

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
