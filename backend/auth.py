import os

import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from utils import verify_password

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "dev_icin_gecici_anahtar")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 hafta geçerli token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@router.post("/login", response_model=schemas.LoginResponse)
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

    access_token = create_access_token(data={"sub": str(db_user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
    }

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id_int = int(user_id)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id_int).first()
    if user is None:
        raise credentials_exception

    if hasattr(user, "is_active") and not user.is_active:
        raise credentials_exception

    return user


def get_current_user_id(token: str = Depends(oauth2_scheme)):
    """Extract user_id from JWT token without database dependency."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return int(user_id)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception


@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user info from JWT token."""
    return current_user


@router.post("/register", response_model=schemas.UserRead, status_code=201)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user exists
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) |
        (models.User.email == user.email)
    ).first()

    if db_user:
        raise HTTPException(
            status_code=400,
            detail="Kullanıcı adı veya email zaten kullanılan"
        )

    # Create new user with hashed password
    from utils import hash_password
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/logout")
def logout(current_user_id: int = Depends(get_current_user_id)):
    """Logout endpoint (JWT is stateless, just client-side removal needed)."""
    return {"message": "Başarıyla çıkış yapıldı"}


@router.post("/forgot-password")
def forgot_password(email: schemas.EmailRequest, db: Session = Depends(get_db)):
    """Request password reset email."""
    db_user = db.query(models.User).filter(models.User.email == email.email).first()

    if not db_user:
        # Security: Don't reveal if email exists
        return {"message": "E-mail adresi bulunursa şifre sıfırlama bağlantısı gönderilecektir"}

    # In production: Send actual email with reset token
    # For now: Just return success message
    return {"message": "E-mail adresi bulunursa şifre sıfırlama bağlantısı gönderilecektir"}


@router.post("/reset-password")
def reset_password(reset_request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password with reset token."""
    # In production: Verify reset token validity and expiration
    # For now: Simple password reset

    db_user = db.query(models.User).filter(
        models.User.email == reset_request.email
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=400,
            detail="Kullanıcı bulunamadı"
        )

    # Update password
    from utils import hash_password
    db_user.password_hash = hash_password(reset_request.new_password)
    db.commit()

    return {"message": "Şifre başarıyla sıfırlandı"}