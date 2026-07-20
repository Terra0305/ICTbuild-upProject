"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-20

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column(
            "role",
            sa.Enum("USER", "ADMIN", name="user_role"),
            nullable=False,
            server_default="USER",
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "lost_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(100), nullable=False),
        sa.Column("category_code", sa.String(50), nullable=False),
        sa.Column("color_codes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("lost_date", sa.Date(), nullable=False),
        sa.Column("region_code", sa.String(20), nullable=False),
        sa.Column("place_text", sa.String(200)),
        sa.Column("description", sa.Text()),
        sa.Column("image_url", sa.Text()),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "FOUND", "CLOSED", name="lost_item_status"),
            nullable=False,
            server_default="ACTIVE",
        ),
        sa.Column("normalized_text", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_lost_items_user_id_status", "lost_items", ["user_id", "status"])
    op.create_index("ix_lost_items_category_date", "lost_items", ["category_code", "lost_date"])
    op.create_index("ix_lost_items_region_code", "lost_items", ["region_code"])

    op.create_table(
        "found_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("source_item_id", sa.String(100), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category_code", sa.String(50), nullable=False),
        sa.Column("color_codes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("found_date", sa.Date(), nullable=False),
        sa.Column("region_code", sa.String(20), nullable=False),
        sa.Column("place_text", sa.String(300)),
        sa.Column("storage_place", sa.String(300)),
        sa.Column("contact_text", sa.String(200)),
        sa.Column("description", sa.Text()),
        sa.Column("image_url", sa.Text()),
        sa.Column("detail_url", sa.Text()),
        sa.Column(
            "status",
            sa.Enum("STORED", "RETURNED", "DISPOSED", "UNKNOWN", name="found_item_status"),
            nullable=False,
            server_default="UNKNOWN",
        ),
        sa.Column("normalized_text", sa.Text()),
        sa.Column("raw_payload", postgresql.JSONB()),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("source", "source_item_id", name="uq_found_item_source"),
    )
    op.create_index("ix_found_items_found_date_category", "found_items", ["found_date", "category_code"])
    op.create_index("ix_found_items_region_code", "found_items", ["region_code"])
    op.create_index("ix_found_items_status", "found_items", ["status"])

    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lost_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lost_items.id"), nullable=False),
        sa.Column("found_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("found_items.id"), nullable=False),
        sa.Column("text_score", sa.Numeric(5, 4)),
        sa.Column("image_score", sa.Numeric(5, 4)),
        sa.Column("category_score", sa.Numeric(5, 4)),
        sa.Column("color_score", sa.Numeric(5, 4)),
        sa.Column("location_score", sa.Numeric(5, 4)),
        sa.Column("date_score", sa.Numeric(5, 4)),
        sa.Column("final_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("reason_codes", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("notified_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("lost_item_id", "found_item_id", name="uq_match_lost_found"),
    )
    op.create_index("ix_matches_lost_item_final_score", "matches", ["lost_item_id", "final_score"])
    op.create_index("ix_matches_found_item_id", "matches", ["found_item_id"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("lost_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lost_items.id"), nullable=False),
        sa.Column("match_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matches.id"), nullable=False),
        sa.Column("channel", sa.Enum("IN_APP", "EMAIL", name="notification_channel"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "SENT", "FAILED", "READ", name="notification_status"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "sync_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column(
            "status",
            sa.Enum("RUNNING", "SUCCESS", "FAILED", name="sync_run_status"),
            nullable=False,
            server_default="RUNNING",
        ),
        sa.Column("fetched_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("upserted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_cursor", sa.String()),
        sa.Column("error_message", sa.Text()),
    )


def downgrade() -> None:
    op.drop_table("sync_runs")
    op.drop_table("notifications")
    op.drop_table("matches")
    op.drop_table("found_items")
    op.drop_table("lost_items")
    op.drop_table("users")
    for enum_name in (
        "notification_status",
        "notification_channel",
        "found_item_status",
        "lost_item_status",
        "user_role",
        "sync_run_status",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
