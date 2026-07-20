import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.schemas import LoginRequest, SignupRequest, TokenResponse


def signup(db: Session, data: SignupRequest) -> User:
    if db.query(User).filter(User.email == data.email).first() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 가입된 이메일입니다.")

    user = User(email=data.email, password_hash=hash_password(data.password), name=data.name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, data: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == data.email).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."
        )

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


def refresh(db: Session, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다.")

    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "사용자를 찾을 수 없습니다.")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )
