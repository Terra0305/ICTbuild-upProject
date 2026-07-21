"""add structured lost-item closure data

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

closure_reason = postgresql.ENUM(
    "MATCHED_BY_REFIND",
    "FOUND_ELSEWHERE",
    "NOT_FOUND",
    "INCORRECT_REGISTRATION",
    name="lost_item_closure_reason",
    create_type=False,
)


def upgrade() -> None:
    closure_reason.create(op.get_bind(), checkfirst=True)
    op.add_column("lost_items", sa.Column("closure_reason", closure_reason, nullable=True))
    op.add_column("lost_items", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("lost_items", "closed_at")
    op.drop_column("lost_items", "closure_reason")
    closure_reason.drop(op.get_bind(), checkfirst=True)
