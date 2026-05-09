import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, selectinload
from wordle import router as wordle_router
from word_chain import router as word_chain_router

sys.path.append(os.path.dirname(__file__))

import models
import schemas
from auth import get_current_user_id, router as auth_router
from dashboard import router as dashboard_router
from database import engine, get_db
from quiz import router as quiz_router
from reports import router as reports_router
from users import router as users_router

load_dotenv()

models.Base.metadata.create_all(bind=engine)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads")).resolve()
WORD_IMAGE_DIR = UPLOAD_DIR / "words"
WORD_IMAGE_DIR.mkdir(parents=True, exist_ok=True)

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


@app.post("/words", status_code=201, tags=["Words"])
def create_word(
    word_data: schemas.WordCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    same_word = (
        db.query(models.Word)
        .filter(models.Word.eng_word.ilike(word_data.eng_word.strip()))
        .filter(models.Word.is_active == True)
        .first()
    )

    if same_word:
        raise HTTPException(status_code=400, detail="Bu İngilizce kelime zaten kayıtlı")

    new_word = models.Word(
        eng_word=word_data.eng_word.strip(),
        tur_word=word_data.tur_word.strip(),
        topic=word_data.topic.strip() if word_data.topic else None,
        difficulty_level=word_data.difficulty_level,
        picture_url=word_data.picture_url,
        audio_url=word_data.audio_url,
        created_by_user_id=user_id,
    )

    db.add(new_word)
    db.flush()

    for index, sample in enumerate(word_data.samples, start=1):
        clean_sample = sample.strip()

        if not clean_sample:
            continue

        db.add(
            models.WordSample(
                word_id=new_word.id,
                sample_text=clean_sample,
                sample_order=index,
            )
        )

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
def list_words(db: Session = Depends(get_db)):
    words = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.is_active == True)
        .order_by(models.Word.id.desc())
        .all()
    )

    return [serialize_word(word) for word in words]


@app.get("/words/{word_id}", response_model=schemas.WordRead, tags=["Words"])
def get_word(word_id: int, db: Session = Depends(get_db)):
    word = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.id == word_id, models.Word.is_active == True)
        .first()
    )

    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    return serialize_word(word)


@app.put("/words/{word_id}", response_model=schemas.WordRead, tags=["Words"])
def update_word(
    word_id: int,
    payload: schemas.WordCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    word = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.id == word_id, models.Word.is_active == True)
        .first()
    )

    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    duplicate_word = (
        db.query(models.Word)
        .filter(models.Word.id != word_id)
        .filter(models.Word.eng_word.ilike(payload.eng_word.strip()))
        .filter(models.Word.is_active == True)
        .first()
    )

    if duplicate_word:
        raise HTTPException(status_code=400, detail="Bu İngilizce kelime zaten kayıtlı")

    word.eng_word = payload.eng_word.strip()
    word.tur_word = payload.tur_word.strip()
    word.topic = payload.topic.strip() if payload.topic else None
    word.difficulty_level = payload.difficulty_level
    word.picture_url = payload.picture_url
    word.audio_url = payload.audio_url
    word.created_by_user_id = word.created_by_user_id or user_id

    db.query(models.WordSample).filter(models.WordSample.word_id == word.id).delete()

    for index, sample in enumerate(payload.samples, start=1):
        clean_sample = sample.strip()

        if not clean_sample:
            continue

        db.add(
            models.WordSample(
                word_id=word.id,
                sample_text=clean_sample,
                sample_order=index,
            )
        )

    db.commit()

    updated_word = (
        db.query(models.Word)
        .options(selectinload(models.Word.samples))
        .filter(models.Word.id == word_id)
        .first()
    )

    return serialize_word(updated_word)


@app.delete("/words/{word_id}", tags=["Words"])
def delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()

    if not word or not word.is_active:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    word.is_active = False
    db.commit()

    return {"message": "Kelime devre dışı bırakıldı", "word_id": word.id}


@app.post("/words/{word_id}/image", tags=["Words"])
def upload_word_image(
    word_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    word = (
        db.query(models.Word)
        .filter(models.Word.id == word_id, models.Word.is_active == True)
        .first()
    )

    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    allowed_extensions = {"jpg", "jpeg", "png", "webp"}
    file_extension = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "bin"
    )

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Sadece jpg, jpeg, png veya webp görsel yüklenebilir",
        )

    file_location = WORD_IMAGE_DIR / f"word_{word_id}.{file_extension}"

    with open(file_location, "wb") as file_object:
        shutil.copyfileobj(file.file, file_object)

    word.picture_url = f"/uploads/words/{file_location.name}"
    word.created_by_user_id = word.created_by_user_id or user_id

    db.commit()

    return {
        "message": "Resim başarıyla yüklendi",
        "picture_url": word.picture_url,
    }