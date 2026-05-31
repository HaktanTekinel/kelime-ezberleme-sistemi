from html import escape
from pathlib import Path
from re import sub

import httpx

from database import SessionLocal
from models import Word

UPLOAD_DIR = Path("uploads/words")
PUBLIC_IMAGE_PREFIX = "/uploads/words"

REQUEST_TIMEOUT = 10
UPDATE_EXISTING_IMAGES = True

HEADERS = {
    "User-Agent": "KelimeHafizam/1.0 (student project; contact: local@example.com)"
}

TOPIC_HINTS = {
    "Hayvanlar": "animal",
    "Doğa": "nature",
    "Yiyecek ve İçecek": "food",
    "Yiyecek & İçecek": "food",
    "Ulaşım": "vehicle",
    "Seyahat": "travel",
    "Spor": "sports",
    "Teknoloji": "technology",
    "Sağlık": "health",
    "Eğitim": "education",
    "Ev ve Eşyalar": "household object",
    "Ev & Eşyalar": "household object",
    "Alışveriş": "shopping",
    "Sanat ve Kültür": "art",
    "Sanat & Kültür": "art",
    "Ekonomi": "economics",
}

NON_VISUAL_TOPICS = {
    "Duygular",
    "Davranış ve Kişilik",
    "Davranış & Kişilik",
    "Genel",
}

NON_VISUAL_WORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "than",
    "this", "that", "these", "those", "you", "your", "yours",
    "yet", "again", "because", "although", "however", "therefore",
    "suddenly", "excellent", "wonderful", "great", "good", "bad",
    "almost", "already", "always", "never", "often", "sometimes",
}

NON_VISUAL_SUFFIXES = (
    "ly",
    "ness",
    "tion",
    "sion",
    "ment",
    "ship",
    "ism",
    "ity",
    "ously",
    "lessly",
    "fully",
)


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = value.replace("ı", "i").replace("ğ", "g").replace("ü", "u")
    value = value.replace("ş", "s").replace("ö", "o").replace("ç", "c")
    value = sub(r"[^a-z0-9]+", "-", value).strip("-")

    return value or "word"


def build_svg(word: Word) -> str:
    english_word = escape(word.eng_word or "Word")
    turkish_word = escape(word.tur_word or "Türkçe karşılık")
    topic = escape(word.topic or "Kelime Hafızam")

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#eef2ff"/>
      <stop offset="100%" stop-color="#ddd6fe"/>
    </linearGradient>
  </defs>
  <rect width="900" height="600" rx="42" fill="url(#background)"/>
  <rect x="95" y="90" width="710" height="420" rx="38" fill="#ffffff"/>
  <text x="450" y="230" text-anchor="middle" font-family="Arial" font-size="74" font-weight="800" fill="#111827">{english_word}</text>
  <text x="450" y="315" text-anchor="middle" font-family="Arial" font-size="42" font-weight="700" fill="#4f46e5">{turkish_word}</text>
  <line x1="250" y1="360" x2="650" y2="360" stroke="#d1d5db" stroke-width="4" stroke-linecap="round"/>
  <text x="450" y="425" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#64748b">{topic}</text>
</svg>
"""


def create_fallback_image(word: Word) -> str:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    file_name = f"{word.id}-{slugify(word.eng_word)}.svg"
    file_path = UPLOAD_DIR / file_name
    file_path.write_text(build_svg(word), encoding="utf-8")

    return f"{PUBLIC_IMAGE_PREFIX}/{file_name}"


def is_visual_word(word: Word) -> bool:
    eng_word = (word.eng_word or "").strip().lower()
    topic = (word.topic or "").strip()

    if not eng_word:
        return False

    if topic in NON_VISUAL_TOPICS:
        return False

    if eng_word in NON_VISUAL_WORDS:
        return False

    return not eng_word.endswith(NON_VISUAL_SUFFIXES)


def get_search_terms(word: Word) -> list[str]:
    eng_word = (word.eng_word or "").strip()
    simple_word = eng_word.replace("-", " ")
    topic = (word.topic or "").strip()
    topic_hint = TOPIC_HINTS.get(topic, "")

    terms = []

    if topic_hint:
        terms.append(f"{simple_word} {topic_hint}")

    terms.append(simple_word)

    return list(dict.fromkeys(term for term in terms if term))


def get_wikipedia_image(client: httpx.Client, search_term: str) -> str | None:
    response = client.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "query",
            "generator": "search",
            "gsrsearch": search_term,
            "gsrlimit": 5,
            "prop": "pageimages",
            "piprop": "thumbnail",
            "pithumbsize": 900,
            "format": "json",
        },
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code != 200:
        return None

    pages = response.json().get("query", {}).get("pages", {})

    for page in pages.values():
        thumbnail = page.get("thumbnail") or {}

        if thumbnail.get("source"):
            return thumbnail["source"]

    return None


def get_commons_image(client: httpx.Client, search_term: str) -> str | None:
    response = client.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query",
            "generator": "search",
            "gsrsearch": search_term,
            "gsrnamespace": 6,
            "gsrlimit": 5,
            "prop": "imageinfo",
            "iiprop": "url",
            "format": "json",
        },
        timeout=REQUEST_TIMEOUT,
    )

    if response.status_code != 200:
        return None

    pages = response.json().get("query", {}).get("pages", {})

    for page in pages.values():
        image_info = page.get("imageinfo") or []

        if image_info:
            image_url = image_info[0].get("url")

            if image_url:
                return image_url

    return None


def find_online_image(client: httpx.Client, word: Word) -> str | None:
    if not is_visual_word(word):
        return None

    for search_term in get_search_terms(word):
        wikipedia_image = get_wikipedia_image(client, search_term)

        if wikipedia_image:
            return wikipedia_image

        commons_image = get_commons_image(client, search_term)

        if commons_image:
            return commons_image

    return None


def should_skip_word(word: Word) -> bool:
    return bool(word.picture_url) and not UPDATE_EXISTING_IMAGES


def update_word_image(client: httpx.Client, word: Word) -> str:
    if should_skip_word(word):
        return "skipped"

    image_url = find_online_image(client, word)

    if image_url:
        word.picture_url = image_url
        return "online"

    word.picture_url = create_fallback_image(word)
    return "fallback"


def main() -> None:
    db = SessionLocal()

    try:
        words = db.query(Word).filter(Word.is_active == True).all()

        online_count = 0
        fallback_count = 0
        skipped_count = 0

        with httpx.Client(headers=HEADERS, follow_redirects=True) as client:
            for word in words:
                result = update_word_image(client, word)

                if result == "online":
                    online_count += 1
                elif result == "fallback":
                    fallback_count += 1
                else:
                    skipped_count += 1

                print(f"{word.id} - {word.eng_word}: {result}")

        db.commit()

        print("--------------------------------")
        print("Kelime görselleri güncellendi.")
        print(f"Online görsel bulunan: {online_count}")
        print(f"Fallback SVG oluşturulan: {fallback_count}")
        print(f"Atlanan kelime: {skipped_count}")
        print("--------------------------------")

    except Exception as error:
        db.rollback()
        print("HATA: İşlem geri alındı.")
        print(error)

    finally:
        db.close()


if __name__ == "__main__":
    main()