from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import sys
import os

sys.path.append(os.path.dirname(__file__))

import models
import schemas
from database import get_db
from utils import hash_password, verify_password
from auth import router as auth_router
from quiz import router as quiz_router


# ============================================================
# DOSYA / RESİM YÜKLEME AYARI
# ============================================================

# Proje klasörü içinde backend/words klasörü oluşturur.
# C:/words yerine bunu kullanmak daha taşınabilir olur.
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "words"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# FASTAPI UYGULAMASI
# ============================================================

app = FastAPI(
    title="Kelime Ezberleme Sistemi API",
    description="6 tekrar prensibi içeren kelime ezberleme sistemi backend API",
    version="1.0.0"
)


# ============================================================
# STATIC FILES
# Frontend buradan resimleri görüntüleyebilir.
# Örnek URL:
# http://127.0.0.1:8000/static/word_1.jpg
# ============================================================

app.mount("/static", StaticFiles(directory=str(UPLOAD_DIR)), name="static")


# ============================================================
# CORS AYARLARI
# React frontend'in backend'e istek atabilmesi için gerekli.
# Vite genelde 5173 portunda çalışır.
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTER TANITIMLARI
# auth.py ve quiz.py dosyalarındaki endpointleri main.py içine dahil eder.
# ============================================================

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(quiz_router, prefix="/quiz", tags=["Quiz"])


# ============================================================
# ANA SAYFA / TEST ENDPOINT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Kelime Ezberleme Sistemi API çalışıyor",
        "docs": "/docs"
    }


# ============================================================
# STORY-1: KULLANICI KAYIT
# ============================================================

@app.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        (models.User.email == user.email) |
        (models.User.username == user.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email veya kullanıcı adı zaten kayıtlı"
        )

    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ============================================================
# STORY-1: GİRİŞ / LOGIN
# ============================================================

@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.username == user.username_or_email) |
        (models.User.email == user.username_or_email)
    ).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Hatalı kullanıcı adı/email veya şifre"
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Kullanıcı hesabı pasif durumda"
        )

    return {
        "message": "Giriş başarılı",
        "user_id": db_user.id,
        "username": db_user.username,
        "email": db_user.email
    }


# ============================================================
# STORY-1: ŞİFREMİ UNUTTUM / DEMO ŞİFRE GÜNCELLEME
# Not:
# Bu demo versiyonda mail gönderimi yapılmaz.
# Kullanıcı adı verilerek yeni şifre atanır.
# ============================================================

@app.put("/forgot-password")
def forgot_password(payload: schemas.PasswordUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.username == payload.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="Kullanıcı bulunamadı"
        )

    db_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {
        "message": "Şifre başarıyla güncellendi",
        "user_id": db_user.id
    }


# ============================================================
# STORY-2: KELİME EKLEME
# ============================================================

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

    for index, sample in enumerate(word_data.samples, start=1):
        new_sample = models.WordSample(
            word_id=new_word.id,
            sample_text=sample,
            sample_order=index
        )
        db.add(new_sample)

    db.commit()

    return {
        "message": "Kelime ve örnek cümleler başarıyla eklendi",
        "word_id": new_word.id
    }


# ============================================================
# STORY-2: KELİMELERİ LİSTELEME
# ============================================================

@app.get("/words", response_model=list[schemas.WordRead])
def list_words(db: Session = Depends(get_db)):
    words = db.query(models.Word).filter(
        models.Word.is_active == True
    ).all()

    return words


# ============================================================
# STORY-2: KELİMEYE RESİM YÜKLEME
# Frontend bu picture_url değerini kullanarak resmi gösterebilir.
# Örnek dönen değer:
# /static/word_1.jpg
# Frontend tarafında:
# http://127.0.0.1:8000/static/word_1.jpg
# ============================================================

@app.post("/words/{word_id}/image")
def upload_word_image(
    word_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    word = db.query(models.Word).filter(
        models.Word.id == word_id
    ).first()

    if not word:
        raise HTTPException(
            status_code=404,
            detail="Kelime bulunamadı"
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Dosya adı bulunamadı"
        )

    allowed_extensions = ["jpg", "jpeg", "png", "webp"]
    file_extension = file.filename.split(".")[-1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Sadece jpg, jpeg, png veya webp dosyası yüklenebilir"
        )

    file_name = f"word_{word_id}.{file_extension}"
    file_location = UPLOAD_DIR / file_name

    with open(file_location, "wb") as file_object:
        shutil.copyfileobj(file.file, file_object)

    word.picture_url = f"/static/{file_name}"
    db.commit()
    db.refresh(word)

    return {
        "message": "Resim başarıyla yüklendi",
        "word_id": word.id,
        "picture_url": word.picture_url
    }
