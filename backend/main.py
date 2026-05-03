from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import sys
import os

sys.path.append(os.path.dirname(__file__))

import models
import schemas
from database import get_db, engine


# Veritabanında olmayan tabloları oluşturur:
# users, words, word_samples, user_word_progress...
models.Base.metadata.create_all(bind=engine)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


app = FastAPI(
    title="Kelime Ezberleme Sistemi API",
    description="6 tekrar prensibi içeren kelime ezberleme sistemi backend API",
    version="1.0.0",
)


# Local frontend adreslerine izin verir.
# localhost:5173, localhost:5174, 127.0.0.1:5173 gibi portlarda çalışır.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Kelime ezberleme backend çalışıyor"}


# STORY-1: KULLANICI KAYIT
@app.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user_by_email = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if db_user_by_email:
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı")

    db_user_by_username = (
        db.query(models.User)
        .filter(models.User.username == user.username)
        .first()
    )

    if db_user_by_username:
        raise HTTPException(status_code=400, detail="Kullanıcı adı zaten kayıtlı")

    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# STORY-1: GİRİŞ
@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username_or_email)
            | (models.User.email == user.username_or_email)
        )
        .first()
    )

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Hatalı kullanıcı adı/email veya şifre",
        )

    return {
        "message": "Giriş başarılı!",
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email,
    }


# STORY-1: ŞİFREMİ UNUTTUM
@app.put("/forgot-password")
def forgot_password(payload: schemas.PasswordUpdate, db: Session = Depends(get_db)):
    db_user = (
        db.query(models.User)
        .filter(models.User.username == payload.username)
        .first()
    )

    if not db_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    db_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {
        "message": "Şifre güncellendi",
        "user_id": db_user.id,
    }


# STORY-2: KELİME EKLEME
@app.post("/words", status_code=201)
def create_word(word_data: schemas.WordCreate, db: Session = Depends(get_db)):
    new_word = models.Word(
        eng_word=word_data.eng_word,
        tur_word=word_data.tur_word,
        topic=word_data.topic,
        difficulty_level=word_data.difficulty_level,
        picture_url=word_data.picture_url,
        audio_url=word_data.audio_url,
    )

    db.add(new_word)
    db.commit()
    db.refresh(new_word)

    for sample in word_data.samples:
        new_sample = models.WordSample(
            word_id=new_word.id,
            sample_text=sample,
        )
        db.add(new_sample)

    db.commit()

    return {
        "message": "Kelime ve örnek cümleler başarıyla eklendi",
        "word_id": new_word.id,
    }


# STORY-2: KELİME LİSTELEME
@app.get("/words", response_model=list[schemas.WordRead])
def list_words(db: Session = Depends(get_db)):
    words = (
        db.query(models.Word)
        .filter(models.Word.is_active == True)
        .all()
    )

    return words