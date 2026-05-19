import os
import secrets
from datetime import datetime, timedelta
from urllib.parse import parse_qs

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from utils import hash_password, verify_password

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "kelime-ezberleme-super-gizli-anahtar-123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        return int(user_id)
    except (JWTError, ValueError):
        raise credentials_exception


def get_current_user(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> models.User:
    user = db.query(models.User).filter(models.User.id == current_user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı bulunamadı veya pasif durumda",
        )

    return user


async def get_login_payload(request: Request) -> tuple[str, str]:
    content_type = request.headers.get("content-type", "")

    if "application/x-www-form-urlencoded" in content_type:
        raw_body = await request.body()
        form_data = parse_qs(raw_body.decode())

        username_or_email = (form_data.get("username") or [""])[0]
        password = (form_data.get("password") or [""])[0]

        return username_or_email, password

    try:
        body = await request.json()
    except Exception:
        body = {}

    username_or_email = (
        body.get("username_or_email")
        or body.get("username")
        or body.get("email")
        or ""
    )
    password = body.get("password") or ""

    return username_or_email, password


@router.post("/register", response_model=schemas.UserRead)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    username_exists = (
        db.query(models.User)
        .filter(models.User.username.ilike(user.username.strip()))
        .first()
    )
    if username_exists:
        raise HTTPException(status_code=400, detail="Kullanıcı adı zaten kayıtlı")

    email_exists = (
        db.query(models.User)
        .filter(models.User.email.ilike(user.email.strip()))
        .first()
    )
    if email_exists:
        raise HTTPException(status_code=400, detail="Email zaten kayıtlı")

    new_user = models.User(
        username=user.username.strip(),
        email=user.email.strip().lower(),
        password_hash=hash_password(user.password),
    )

    db.add(new_user)
    db.flush()

    db.add(
        models.UserSettings(
            user_id=new_user.id,
            daily_new_word_count=10,
            quiz_question_count=10,
        )
    )

    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=schemas.Token)
async def login(request: Request, db: Session = Depends(get_db)):
    username_or_email, password = await get_login_payload(request)
    login_value = username_or_email.strip()

    if not login_value or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Kullanıcı adı/email ve şifre zorunludur",
        )

    db_user = (
        db.query(models.User)
        .filter(
            or_(
                models.User.username.ilike(login_value),
                models.User.email.ilike(login_value),
            )
        )
        .first()
    )

    if not db_user or not verify_password(password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı kullanıcı adı/email veya şifre",
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu kullanıcı pasif durumda",
        )

    access_token = create_access_token(data={"sub": str(db_user.id)})

    return schemas.Token(
        access_token=access_token,
        token_type="bearer",
        user_id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        user=schemas.TokenUser(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
        ),
    )


@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
def forgot_password(
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.email.ilike(payload.email)).first()

    if not user:
        return schemas.ForgotPasswordResponse(
            message="Eğer sistemde böyle bir email varsa, sıfırlama kodu oluşturuldu.",
            reset_token=None,
        )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)

    reset_token = models.PasswordResetToken(
        token=token,
        user_id=user.id,
        expires_at=expires_at,
    )

    db.add(reset_token)
    db.commit()

    return schemas.ForgotPasswordResponse(
        message="Sıfırlama kodu oluşturuldu. Demo modda token response içinde döner.",
        reset_token=token,
    )


@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(
    payload: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    reset_token = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token == payload.reset_token)
        .first()
    )

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Geçersiz sıfırlama token'ı",
        )

    if reset_token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu token zaten kullanılmış",
        )

    if reset_token.expires_at and reset_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token'ın süresi dolmuş",
        )

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı",
        )

    user.password_hash = hash_password(payload.new_password)
    reset_token.is_used = True

    db.commit()

    return schemas.MessageResponse(message="Şifreniz başarıyla güncellendi")


@router.post("/logout", response_model=schemas.MessageResponse)
def logout():
    return schemas.MessageResponse(
        message="Çıkış yapıldı. Frontend tarafındaki token silinmelidir."
    )


@router.get("/me", response_model=schemas.UserRead)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user