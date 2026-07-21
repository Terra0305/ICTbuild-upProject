import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, REAL, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPKMixin


class UserRole(enum.StrEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class LostItemStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    FOUND = "FOUND"
    CLOSED = "CLOSED"


class LostItemClosureReason(enum.StrEnum):
    MATCHED_BY_REFIND = "MATCHED_BY_REFIND"
    FOUND_ELSEWHERE = "FOUND_ELSEWHERE"
    NOT_FOUND = "NOT_FOUND"
    INCORRECT_REGISTRATION = "INCORRECT_REGISTRATION"


class FoundItemStatus(enum.StrEnum):
    STORED = "STORED"
    RETURNED = "RETURNED"
    DISPOSED = "DISPOSED"
    UNKNOWN = "UNKNOWN"


class NotificationChannel(enum.StrEnum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"


class NotificationStatus(enum.StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    READ = "READ"


class SyncRunStatus(enum.StrEnum):
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.USER
    )

    lost_items: Mapped[list["LostItem"]] = relationship(back_populates="user")


class LostItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "lost_items"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    category_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    custom_category: Mapped[str | None] = mapped_column(String(50))
    color_codes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    custom_color_text: Mapped[str | None] = mapped_column(String(50))
    lost_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    region_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    place_text: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[LostItemStatus] = mapped_column(
        Enum(LostItemStatus, name="lost_item_status"),
        nullable=False,
        default=LostItemStatus.ACTIVE,
        index=True,
    )
    closure_reason: Mapped[LostItemClosureReason | None] = mapped_column(
        Enum(LostItemClosureReason, name="lost_item_closure_reason")
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    normalized_text: Mapped[str | None] = mapped_column(Text)
    text_embedding: Mapped[list[float] | None] = mapped_column(ARRAY(REAL))

    user: Mapped["User"] = relationship(back_populates="lost_items")


class FoundItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "found_items"
    __table_args__ = (UniqueConstraint("source", "source_item_id", name="uq_found_item_source"),)

    source: Mapped[str] = mapped_column(String(30), nullable=False)
    source_item_id: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    color_codes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    found_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    region_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    place_text: Mapped[str | None] = mapped_column(String(300))
    storage_place: Mapped[str | None] = mapped_column(String(300))
    contact_text: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    detail_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[FoundItemStatus] = mapped_column(
        Enum(FoundItemStatus, name="found_item_status"),
        nullable=False,
        default=FoundItemStatus.UNKNOWN,
        index=True,
    )
    normalized_text: Mapped[str | None] = mapped_column(Text)
    text_embedding: Mapped[list[float] | None] = mapped_column(ARRAY(REAL))
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Match(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("lost_item_id", "found_item_id", name="uq_match_lost_found"),
    )

    lost_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lost_items.id"), nullable=False, index=True
    )
    found_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("found_items.id"), nullable=False, index=True
    )
    text_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    image_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    category_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    color_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    location_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    date_score: Mapped[float | None] = mapped_column(Numeric(5, 4))
    final_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    reason_codes: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Notification(UUIDPKMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    lost_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lost_items.id"), nullable=False
    )
    match_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matches.id"), nullable=False
    )
    channel: Mapped[NotificationChannel] = mapped_column(
        Enum(NotificationChannel, name="notification_channel"), nullable=False
    )
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus, name="notification_status"),
        nullable=False,
        default=NotificationStatus.PENDING,
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )


class SyncRun(UUIDPKMixin, Base):
    __tablename__ = "sync_runs"

    source: Mapped[str] = mapped_column(String(30), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[SyncRunStatus] = mapped_column(
        Enum(SyncRunStatus, name="sync_run_status"), nullable=False, default=SyncRunStatus.RUNNING
    )
    fetched_count: Mapped[int] = mapped_column(default=0)
    upserted_count: Mapped[int] = mapped_column(default=0)
    last_cursor: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(Text)
