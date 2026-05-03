import os
import sys

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(__file__))

import models
import schemas
from auth import router as auth_router, get_current_user
from database import get_db, engine
from quiz import router as quiz_router
from users import router as users_router


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


app = FastAPI()

# Veritabanı tabloları yoksa otomatik oluşturur.
# users, words, word_samples, user_word_progress tablolarını models.py dosyasına göre açar.
models.Base.metadata.create_all(bind=engine)


origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(quiz_router, prefix="/quiz", tags=["Quiz"])
app.include_router(users_router, prefix="/users", tags=["Users"])


@app.get("/")
def home():
    return {"message": "Backend çalışıyor"}


# STORY-1: KULLANICI KAYIT
@app.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user_email = db.query(models.User).filter(models.User.email == user.email).first()

    if db_user_email:
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı")

    db_user_username = (
        db.query(models.User)
        .filter(models.User.username == user.username)
        .first()
    )

    if db_user_username:
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


# STORY-1: ŞİFREMİ UNUTTUM / ŞİFRE GÜNCELLEME
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
def create_word(word_data: schemas.WordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
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

    for index, sample in enumerate(word_data.samples, start=1):
        new_sample = models.WordSample(
            word_id=new_word.id,
            sample_text=sample,
            sample_order=index,
        )
        db.add(new_sample)

    db.commit()

    return {
        "message": "Kelime ve örnek cümleler başarıyla eklendi",
        "word_id": new_word.id,
    }


@app.get("/words/{word_id}", response_model=schemas.WordRead)
def get_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id, models.Word.is_active == True).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")
    return word


@app.put("/words/{word_id}", response_model=schemas.WordRead)
def update_word(word_id: int, payload: schemas.WordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    word.eng_word = payload.eng_word
    word.tur_word = payload.tur_word
    word.topic = payload.topic
    word.difficulty_level = payload.difficulty_level
    word.picture_url = payload.picture_url
    word.audio_url = payload.audio_url

    # remove old samples
    db.query(models.WordSample).filter(models.WordSample.word_id == word.id).delete()

    for index, sample in enumerate(payload.samples, start=1):
        new_sample = models.WordSample(word_id=word.id, sample_text=sample, sample_order=index)
        db.add(new_sample)

    db.commit()
    db.refresh(word)
    return word


@app.delete("/words/{word_id}")
def delete_word(word_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    # soft delete
    word.is_active = False
    db.commit()
    return {"message": "Kelime devre dışı bırakıldı", "word_id": word.id}


# STORY-2: KELİME LİSTELEME
@app.get("/words", response_model=list[schemas.WordRead])
def list_words(db: Session = Depends(get_db)):
    words = db.query(models.Word).filter(models.Word.is_active == True).all()
    return words