import logging
import smtplib
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import LostItem, Match, Notification, NotificationChannel, NotificationStatus

logger = logging.getLogger(__name__)

# A new account can qualify hundreds of matches at once (initial backfill); one
# alert per match buried users. Only the best few per lost item are announced per
# day, the rest stay visible on the matches page.
MAX_NOTIFICATIONS_PER_LOST_ITEM_PER_DAY = 3


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


def plan_notifications(
    matches: list[Match], already_today: dict, cap: int = MAX_NOTIFICATIONS_PER_LOST_ITEM_PER_DAY
) -> tuple[list[Match], list[Match]]:
    """Split fresh matches into (to notify, suppressed) with a per-lost-item daily cap.

    Highest scores win; notifications already sent in the last day use up the cap.
    """
    by_lost_item: dict = defaultdict(list)
    for match in matches:
        if match.notified_at is None:
            by_lost_item[match.lost_item_id].append(match)

    notify: list[Match] = []
    suppressed: list[Match] = []
    for lost_item_id, group in by_lost_item.items():
        group.sort(key=lambda m: m.final_score, reverse=True)
        room = max(cap - already_today.get(lost_item_id, 0), 0)
        notify.extend(group[:room])
        suppressed.extend(group[room:])
    return notify, suppressed


def _sent_in_last_day(db: Session, lost_item_ids: set) -> dict:
    if not lost_item_ids:
        return {}
    since = datetime.now(UTC) - timedelta(days=1)
    rows = (
        db.query(Notification.lost_item_id, func.count())
        .filter(
            Notification.lost_item_id.in_(lost_item_ids),
            Notification.channel == NotificationChannel.IN_APP,
            Notification.created_at >= since,
        )
        .group_by(Notification.lost_item_id)
        .all()
    )
    return dict(rows)


def notify_matches(db: Session, matches: list[Match]) -> list[Notification]:
    """Create IN_APP + EMAIL notifications for matches that just crossed the
    notification threshold (spec §9.3). Skips matches already notified and caps
    alerts per lost item per day; matches over the cap are marked handled so they
    are not announced later one by one."""
    created: list[Notification] = []

    to_notify, suppressed = plan_notifications(
        matches, _sent_in_last_day(db, {m.lost_item_id for m in matches})
    )
    now = datetime.now(UTC)
    for match in suppressed:
        match.notified_at = now

    for match in to_notify:
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

        if not get_settings().smtp_host:
            # No mail transport: don't surface a permanently FAILED "email" to the user.
            match.notified_at = datetime.now(UTC)
            continue

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
