"""add password reset token to users

Revision ID: cdc25a4fe227
Revises: 04a2227d0344
Create Date: 2026-08-06 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cdc25a4fe227'
down_revision: Union[str, None] = '04a2227d0344'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_reset_token', sa.String(length=64), nullable=True))
    op.add_column(
        'users', sa.Column('password_reset_sent_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        op.f('ix_users_password_reset_token'), 'users', ['password_reset_token'], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_users_password_reset_token'), table_name='users')
    op.drop_column('users', 'password_reset_sent_at')
    op.drop_column('users', 'password_reset_token')
