from html import escape
from pathlib import Path
from re import sub

from database import SessionLocal
from models import Word


UPLOAD_DIR = Path("uploads/words")
PUBLIC_IMAGE_PREFIX = "/uploads/words"

UPDATE_EXISTING_IMAGES = False


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = value.replace("ı", "i").replace("ğ", "g").replace("ü", "u")
    value = value.replace("ş", "s").replace("ö", "o").replace("ç", "c")
    value = sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")

    return value or "word"


def build_svg(word: Word) -> str:
    english_word = escape(word.eng_word or "Word")
    turkish_word = escape(word.tur_word or "Türkçe karşılık")
    topic = escape(word.topic or "Kelime Hafızam")
    level = escape(str(word.difficulty_level or ""))

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef2ff"/>
      <stop offset="100%" stop-color="#dcfce7"/>
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#111827" flood-opacity="0.18"/>
    </filter>
  </defs>

  <rect width="900" height="600" rx="42" fill="url(#background)"/>

  <circle cx="130" cy="115" r="72" fill="#ffffff" opacity="0.45"/>
  <circle cx="780" cy="485" r="110" fill="#ffffff" opacity="0.36"/>

  <rect x="95" y="90" width="710" height="420" rx="38" fill="#ffffff" filter="url(#shadow)" opacity="0.96"/>

  <text x="450" y="205"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="76"
        font-weight="800"
        fill="#111827">{english_word}</text>

  <text x="450" y="292"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="44"
        font-weight="700"
        fill="#16a34a">{turkish_word}</text>

  <line x1="250" y1="342" x2="650" y2="342"
        stroke="#d1d5db"
        stroke-width="4"
        stroke-linecap="round"/>

  <text x="450" y="403"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="28"
        font-weight="700"
        fill="#4f46e5">Seviye {level}</text>

  <text x="450" y="454"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="24"
        font-weight="600"
        fill="#64748b">{topic}</text>
</svg>
"""


def create_word_image(word: Word) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"{word.id}-{slugify(word.eng_word)}.svg"
    file_path = UPLOAD_DIR / file_name

    file_path.write_text(build_svg(word), encoding="utf-8")

    return f"{PUBLIC_IMAGE_PREFIX}/{file_name}"


def should_skip_word(word: Word) -> bool:
    return bool(word.picture_url) and not UPDATE_EXISTING_IMAGES


def main() -> None:
    db = SessionLocal()

    try:
        words = db.query(Word).filter(Word.is_active == True).all()

        if not words:
            print("Veritabanında aktif kelime bulunamadı.")
            return

        updated_count = 0
        skipped_count = 0

        for word in words:
            if should_skip_word(word):
                skipped_count += 1
                continue

            word.picture_url = create_word_image(word)
            updated_count += 1

        db.commit()

        print("--------------------------------")
        print("Kelime görselleri oluşturuldu.")
        print(f"Güncellenen kelime sayısı: {updated_count}")
        print(f"Zaten görseli olduğu için atlanan: {skipped_count}")
        print("--------------------------------")
        print("Örnek görsel yolu:")
        print("/uploads/words/1-apple.svg")

    except Exception as error:
        db.rollback()
        print("HATA: İşlem geri alındı.")
        print(error)

    finally:
        db.close()


if __name__ == "__main__":
    main()