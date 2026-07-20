import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models import Notification, NotificationStatus, User
from app.schemas.schemas import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Notification:
    notification = db.get(Notification, notification_id)
    if notification is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "알림을 찾을 수 없습니다.")
    if notification.user_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "본인의 알림만 읽을 수 있습니다.")

    notification.status = NotificationStatus.READ
    notification.read_at = datetime.now(UTC)
    db.commit()
    db.refresh(notification)
    return notification
