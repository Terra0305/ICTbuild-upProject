from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas.schemas import (
    LoginRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)) -> User:
    return auth_service.signup(db, data)


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.login(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    return auth_service.refresh(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> User:
    return user
