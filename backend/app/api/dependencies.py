import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import User, UserRole

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "인증이 필요합니다.")

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "유효하지 않은 토큰입니다.")

    user = db.get(User, uuid.UUID(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "사용자를 찾을 수 없습니다.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자만 접근할 수 있습니다.")
    return user
