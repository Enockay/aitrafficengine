"""add avatar_url to platform_accounts

Revision ID: 276fcb12c009
Revises: cdc25a4fe227
Create Date: 2026-08-06 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '276fcb12c009'
down_revision: Union[str, None] = 'cdc25a4fe227'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('platform_accounts', sa.Column('avatar_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('platform_accounts', 'avatar_url')
