"""add media columns to posts

Revision ID: 3f1a9c2e5b7d
Revises: 276fcb12c009
Create Date: 2026-08-06 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3f1a9c2e5b7d'
down_revision: Union[str, None] = '276fcb12c009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('media_path', sa.String(length=500), nullable=True))
    op.add_column('posts', sa.Column('media_type', sa.String(length=10), nullable=True))
    op.add_column('posts', sa.Column('media_mime_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('posts', 'media_mime_type')
    op.drop_column('posts', 'media_type')
    op.drop_column('posts', 'media_path')
