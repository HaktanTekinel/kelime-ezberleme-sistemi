import os
import shutil
import sys
from pathlib import Path
from typing import Annotated

sys.path.append(os.path.dirname(__file__))

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import selectinload

import models
import schemas
from auth import DbSession, get_current_user_id, router as auth_router
from dashboard import router as dashboard_router
from database import engine
from db_setup import initialize_database
from quiz import router as quiz_router
from reports import router as reports_router
from users import router as users_router
from word_chain import router as word_chain_router
from wordle import router as wordle_router

load_dotenv()

initialize_database(engine)

BACKEND_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))

if not UPLOAD_DIR.is_absolute():
    UPLOAD_DIR = BACKEND_DIR / UPLOAD_DIR

UPLOAD_DIR = UPLOAD_DIR.resolve()
WORD_IMAGE_DIR = UPLOAD_DIR / "words"
WORD_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

UserId = Annotated[int, Depends(get_current_user_id)]
ImageFile = Annotated[UploadFile, File(...)]

WORD_RESPONSES = {
    status.HTTP_400_BAD_REQUEST: {
        "description": "Kelime verisi geçersiz veya aynı kelime zaten kayıtlı."
    },
    status.HTTP_404_NOT_FOUND: {
        "description": "Kelime bulunamadı."
    },
}

app = FastAPI(
    title="Kelime Ezberleme Sistemi API",
    description="6 tekrar prensibi içeren kelime ezberleme sistemi backend API",
    version="1.0.0",
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
)
origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(quiz_router, prefix="/quiz", tags=["Quiz"])
app.include_router(reports_router, prefix="/reports", tags=["Reports"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(wordle_router, prefix="/wordle", tags=["Wordle"])
app.include_router(word_chain_router, prefix="/word-chain", tags=["Word Chain"])


@app.get("/")
def home():
    return {"message": "Backend çalışıyor"}


def serialize_word(word: models.Word) -> dict:
    samples = sorted(word.samples or [], key=lambda sample: sample.sample_order)

    return {
        "id": word.id,
        "eng_word": word.eng_word,
        "tur_word": word.tur_word,
        "difficulty_level": word.difficulty_level,
        "topic": word.topic,
        "picture_url": word.picture_url,
        "audio_url": word.audio_url,
        "samples": [sample.sample_text for sample in samples],
        "created_by_user_id": word.created_by_user_id,
    }


def get_active_word(db: DbSession, word_id: int) -> models.Word:
    word = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.id == word_id, models.Word.is_active.is_(True))
        .first()
    )

    if not word:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kelime bulunamadı",
        )

    return word


def find_duplicate_word(
    db: DbSession,
    english_word: str,
    excluded_word_id: int | None = None,
) -> models.Word | None:
    query = (
        db.query(models.Word)
        .filter(models.Word.eng_word.ilike(english_word.strip()))
        .filter(models.Word.is_active.is_(True))
    )

    if excluded_word_id is not None:
        query = query.filter(models.Word.id != excluded_word_id)

    return query.first()


def normalize_topic(topic: str | None) -> str | None:
    return topic.strip() if topic else None


def add_word_samples(
    db: DbSession,
    word_id: int,
    samples: list[str],
) -> None:
    for index, sample in enumerate(samples, start=1):
        clean_sample = sample.strip()

        if not clean_sample:
            continue

        db.add(
            models.WordSample(
                word_id=word_id,
                sample_text=clean_sample,
                sample_order=index,
            )
        )


def apply_word_payload(
    word: models.Word,
    payload: schemas.WordCreate,
    user_id: int,
) -> None:
    word.eng_word = payload.eng_word.strip()
    word.tur_word = payload.tur_word.strip()
    word.topic = normalize_topic(payload.topic)
    word.difficulty_level = payload.difficulty_level
    word.picture_url = payload.picture_url
    word.audio_url = payload.audio_url
    word.created_by_user_id = word.created_by_user_id or user_id


@app.post(
    "/words",
    status_code=status.HTTP_201_CREATED,
    tags=["Words"],
    responses=WORD_RESPONSES,
)
def create_word(
    word_data: schemas.WordCreate,
    db: DbSession,
    user_id: UserId,
):
    if find_duplicate_word(db, word_data.eng_word):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu İngilizce kelime zaten kayıtlı",
        )

    new_word = models.Word(
        eng_word=word_data.eng_word.strip(),
        tur_word=word_data.tur_word.strip(),
        topic=normalize_topic(word_data.topic),
        difficulty_level=word_data.difficulty_level,
        picture_url=word_data.picture_url,
        audio_url=word_data.audio_url,
        created_by_user_id=user_id,
    )

    db.add(new_word)
    db.flush()

    add_word_samples(db, new_word.id, word_data.samples)

    db.commit()
    db.refresh(new_word)

    return {
        "message": "Kelime ve örnek cümleler başarıyla eklendi",
        "word_id": new_word.id,
        "id": new_word.id,
        "eng_word": new_word.eng_word,
        "tur_word": new_word.tur_word,
    }


@app.get("/words", response_model=list[schemas.WordRead], tags=["Words"])
def list_words(db: DbSession):
    words = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.is_active.is_(True))
        .order_by(models.Word.id.desc())
        .all()
    )

    return [serialize_word(word) for word in words]


@app.get(
    "/words/{word_id}",
    response_model=schemas.WordRead,
    tags=["Words"],
    responses=WORD_RESPONSES,
)
def get_word(word_id: int, db: DbSession):
    return serialize_word(get_active_word(db, word_id))


@app.put(
    "/words/{word_id}",
    response_model=schemas.WordRead,
    tags=["Words"],
    responses=WORD_RESPONSES,
)
def update_word(
    word_id: int,
    payload: schemas.WordCreate,
    db: DbSession,
    user_id: UserId,
):
    word = get_active_word(db, word_id)

    if find_duplicate_word(db, payload.eng_word, excluded_word_id=word_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu İngilizce kelime zaten kayıtlı",
        )

    apply_word_payload(word, payload, user_id)

    db.query(models.WordSample).filter(models.WordSample.word_id == word.id).delete()
    add_word_samples(db, word.id, payload.samples)

    db.commit()

    updated_word = get_active_word(db, word_id)

    return serialize_word(updated_word)


@app.delete(
    "/words/{word_id}",
    tags=["Words"],
    responses=WORD_RESPONSES,
)
def delete_word(
    word_id: int,
    db: DbSession,
    user_id: UserId,
):
    del user_id

    word = db.query(models.Word).filter(models.Word.id == word_id).first()

    if not word or not word.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kelime bulunamadı",
        )

    word.is_active = False
    db.commit()

    return {"message": "Kelime devre dışı bırakıldı", "word_id": word.id}


def get_allowed_image_extension(filename: str | None) -> str:
    allowed_extensions = {"jpg", "jpeg", "png", "webp"}

    if filename and "." in filename:
        file_extension = filename.rsplit(".", 1)[-1].lower()
    else:
        file_extension = "bin"

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sadece jpg, jpeg, png veya webp görsel yüklenebilir",
        )

    return file_extension


@app.post(
    "/words/{word_id}/image",
    tags=["Words"],
    responses=WORD_RESPONSES,
)
def upload_word_image(
    word_id: int,
    file: ImageFile,
    db: DbSession,
    user_id: UserId,
):
    word = get_active_word(db, word_id)
    file_extension = get_allowed_image_extension(file.filename)
    file_location = WORD_IMAGE_DIR / f"word_{word_id}.{file_extension}"

    with file_location.open("wb") as file_object:
        shutil.copyfileobj(file.file, file_object)

    word.picture_url = f"/uploads/words/{file_location.name}"
    word.created_by_user_id = word.created_by_user_id or user_id

    db.commit()

    return {
        "message": "Resim başarıyla yüklendi",
        "picture_url": word.picture_url,
    }
