"""add last_report_sent_at to users

Revision ID: 5b2c8f4e7a91
Revises: 8e4d6a1f9c3b
Create Date: 2026-08-06 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5b2c8f4e7a91'
down_revision: Union[str, None] = '8e4d6a1f9c3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('last_report_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_report_sent_at')
