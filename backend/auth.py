import os
from datetime import datetime, timedelta
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

import models, schemas
from database import get_db
from utils import hash_password, verify_password

# .env dosyasından environment değişkenlerini yükle
load_dotenv()

router = APIRouter()

# .env dosyasından veya environment'tan değer oku
SECRET_KEY = os.environ.get("SECRET_KEY", "kelime-ezberleme-super-gizli-anahtar-123")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# FastAPI'nin yetkilendirme şeması (Swagger'da sağ üstteki kilit butonunu aktif eder)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# İŞTE SİHRİN GERÇEKLEŞTİĞİ FONKSİYON: Token'ı çözer ve içinden user_id'yi çıkarır
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return int(user_id)
    except JWTError:
        raise credentials_exception

@router.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı")
    
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.username == user.username_or_email) |
        (models.User.email == user.username_or_email)
    ).first()

    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Hatalı kullanıcı adı/email veya şifre")

    # Başarılı girişte Token üretiliyor (sub içerisine user_id saklanıyor)
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user_id": db_user.id}

@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        pr = models.PasswordResetToken(token=token, user_id=user.id, expires_at=expires_at)
        db.add(pr)
        db.commit()
        db.refresh(pr)
        return schemas.ForgotPasswordResponse(message="Sıfırlama kodu oluşturuldu (Demo)", reset_token=token)
    return schemas.ForgotPasswordResponse(message="Eğer sistemde böyle bir email varsa, sıfırlama kodu oluşturuldu.", reset_token=None)

@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    pr = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token == payload.reset_token).first()
    if not pr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Geçersiz sıfırlama token'ı")
    if pr.is_used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu token zaten kullanılmış")
    if pr.expires_at and pr.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token'ın süresi dolmuş")

    user = db.query(models.User).filter(models.User.id == pr.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")

    user.password_hash = hash_password(payload.new_password)
    pr.is_used = True
    db.commit()
    return schemas.MessageResponse(message="Şifreniz başarıyla güncellendi")

@router.post("/logout", response_model=schemas.MessageResponse)
def logout():
    return schemas.MessageResponse(message="Çıkış yapıldı. Lütfen frontend tarafındaki token'ı silin.")

def get_current_user(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """JWT'den user_id çıkardıktan sonra veritabanından user'ı çeker"""
    user = db.query(models.User).filter(models.User.id == current_user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı"
        )

    return user

@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Mevcut oturum açmış kullanıcının bilgilerini döner"""
    return current_user