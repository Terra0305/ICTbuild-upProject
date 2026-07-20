"""add text embeddings

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("lost_items", sa.Column("text_embedding", postgresql.ARRAY(sa.REAL()), nullable=True))
    op.add_column("found_items", sa.Column("text_embedding", postgresql.ARRAY(sa.REAL()), nullable=True))


def downgrade() -> None:
    op.drop_column("found_items", "text_embedding")
    op.drop_column("lost_items", "text_embedding")
