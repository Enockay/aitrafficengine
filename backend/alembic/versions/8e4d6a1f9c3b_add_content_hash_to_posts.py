"""add content_hash to posts

Revision ID: 8e4d6a1f9c3b
Revises: 3f1a9c2e5b7d
Create Date: 2026-08-06 16:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8e4d6a1f9c3b'
down_revision: Union[str, None] = '3f1a9c2e5b7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('content_hash', sa.String(length=64), nullable=True))
    op.create_index('ix_posts_content_hash', 'posts', ['content_hash'])


def downgrade() -> None:
    op.drop_index('ix_posts_content_hash', table_name='posts')
    op.drop_column('posts', 'content_hash')
