"""add scopes to platform_credentials, relax client_id/secret nullability

Revision ID: d4e9a1f7c2b8
Revises: c8f3a6e2b4d1
Create Date: 2026-08-12 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e9a1f7c2b8'
down_revision: Union[str, None] = 'c8f3a6e2b4d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('platform_credentials', sa.Column('scopes', sa.Text(), nullable=True))
    op.alter_column('platform_credentials', 'client_id', existing_type=sa.String(length=255), nullable=True)
    op.alter_column('platform_credentials', 'client_secret', existing_type=sa.String(length=500), nullable=True)


def downgrade() -> None:
    op.alter_column('platform_credentials', 'client_secret', existing_type=sa.String(length=500), nullable=False)
    op.alter_column('platform_credentials', 'client_id', existing_type=sa.String(length=255), nullable=False)
    op.drop_column('platform_credentials', 'scopes')
