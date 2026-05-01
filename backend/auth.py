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