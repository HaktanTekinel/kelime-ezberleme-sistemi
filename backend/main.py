import os
import sys
import shutil
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(__file__))

import models
import schemas
from database import get_db, engine
# Yeni token mantığımızı (get_current_user_id) auth dosyasından alıyoruz
from auth import router as auth_router, get_current_user_id
from quiz import router as quiz_router
from users import router as users_router

# Veritabanı tabloları yoksa otomatik oluşturur.
models.Base.metadata.create_all(bind=engine)

# PR İNCELEME DÜZELTMESİ: API ile çakışmaması için klasör adı "uploads" yapıldı
UPLOAD_DIR = Path("C:/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()

# PR İNCELEME DÜZELTMESİ: /words endpoint çakışması giderildi, path "/uploads" yapıldı
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

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

# Router'ları (Alt uygulamaları) bağlıyoruz
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(quiz_router, prefix="/quiz", tags=["Quiz"])
app.include_router(users_router, prefix="/users", tags=["Users"])


@app.get("/")
def home():
    return {"message": "Backend çalışıyor"}

# NOT: register, login ve forgot_password fonksiyonları auth.py içine taşındığı için buradan silinmiştir.

# STORY-2: KELİME EKLEME (Token korumalı)
@app.post("/words", status_code=201, tags=["Words"])
def create_word(word_data: schemas.WordCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
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
    return {"message": "Kelime ve örnek cümleler başarıyla eklendi", "word_id": new_word.id}

# STORY-2: KELİME LİSTELEME
@app.get("/words", response_model=list[schemas.WordRead], tags=["Words"])
def list_words(db: Session = Depends(get_db)):
    words = db.query(models.Word).filter(models.Word.is_active == True).all()
    return words

@app.get("/words/{word_id}", response_model=schemas.WordRead, tags=["Words"])
def get_word(word_id: int, db: Session = Depends(get_db)):
    word = db.query(models.Word).filter(models.Word.id == word_id, models.Word.is_active == True).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")
    return word

# KELİME GÜNCELLEME (Token korumalı)
@app.put("/words/{word_id}", response_model=schemas.WordRead, tags=["Words"])
def update_word(word_id: int, payload: schemas.WordCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    word.eng_word = payload.eng_word
    word.tur_word = payload.tur_word
    word.topic = payload.topic
    word.difficulty_level = payload.difficulty_level
    word.picture_url = payload.picture_url
    word.audio_url = payload.audio_url

    # Eski örnek cümleleri silip yenilerini ekliyoruz
    db.query(models.WordSample).filter(models.WordSample.word_id == word.id).delete()

    for index, sample in enumerate(payload.samples, start=1):
        new_sample = models.WordSample(word_id=word.id, sample_text=sample, sample_order=index)
        db.add(new_sample)

    db.commit()
    db.refresh(word)
    return word

# KELİME SİLME (Token korumalı)
@app.delete("/words/{word_id}", tags=["Words"])
def delete_word(word_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    # Veriyi veritabanından tamamen uçurmak yerine "is_active = False" (Soft Delete) yapıyoruz
    word.is_active = False
    db.commit()
    return {"message": "Kelime devre dışı bırakıldı", "word_id": word.id}

# RESİM YÜKLEME (Token korumalı)
@app.post("/words/{word_id}/image", tags=["Words"])
def upload_word_image(word_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    word = db.query(models.Word).filter(models.Word.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı")

    file_extension = file.filename.split(".")[-1] if file.filename and "." in file.filename else "bin"
    file_location = UPLOAD_DIR / f"word_{word_id}.{file_extension}"

    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    # PR İNCELEME DÜZELTMESİ: /words/ yerine API çakışması yapmayan /uploads/ kullanılıyor
    word.picture_url = f"/uploads/{file_location.name}"
    db.commit()

    return {"message": "Resim başarıyla yüklendi", "picture_url": word.picture_url}