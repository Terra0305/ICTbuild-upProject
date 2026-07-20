import logging
import smtplib
from datetime import UTC, datetime
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import LostItem, Match, Notification, NotificationChannel, NotificationStatus

logger = logging.getLogger(__name__)


def _send_email(to_address: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.smtp_host:
        logger.info("SMTP not configured; skipping email send (subject=%s)", subject)
        raise RuntimeError("SMTP not configured")

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = to_address
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_user:
            smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def notify_matches(db: Session, matches: list[Match]) -> list[Notification]:
    """Create IN_APP + EMAIL notifications for matches that just crossed the
    notification threshold (spec §9.3). Skips matches already notified."""
    created: list[Notification] = []

    for match in matches:
        if match.notified_at is not None:
            continue

        lost_item = db.get(LostItem, match.lost_item_id)
        if lost_item is None:
            continue

        in_app = Notification(
            user_id=lost_item.user_id,
            lost_item_id=lost_item.id,
            match_id=match.id,
            channel=NotificationChannel.IN_APP,
            status=NotificationStatus.SENT,
            sent_at=datetime.now(UTC),
        )
        db.add(in_app)
        created.append(in_app)

        email_notification = Notification(
            user_id=lost_item.user_id,
            lost_item_id=lost_item.id,
            match_id=match.id,
            channel=NotificationChannel.EMAIL,
            status=NotificationStatus.PENDING,
        )
        db.add(email_notification)
        db.flush()

        try:
            _send_email(
                lost_item.user.email,
                "ReFind - 분실물과 유사한 습득물을 찾았습니다",
                f"'{lost_item.title}'와 매칭 점수 {float(match.final_score) * 100:.0f}점인 "
                "습득물이 등록되었습니다. 서비스에서 확인해주세요.",
            )
            email_notification.status = NotificationStatus.SENT
            email_notification.sent_at = datetime.now(UTC)
        except Exception as exc:  # noqa: BLE001 - external I/O, record and continue
            email_notification.status = NotificationStatus.FAILED
            email_notification.error_message = str(exc)[:500]

        created.append(email_notification)
        match.notified_at = datetime.now(UTC)

    db.commit()
    return created
