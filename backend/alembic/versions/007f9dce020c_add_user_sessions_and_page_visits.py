"""add user_sessions and page_visits tables

Revision ID: 007f9dce020c
Revises: e099f3797415
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '007f9dce020c'
down_revision: Union[str, None] = 'e099f3797415'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('browser', sa.String(length=50), nullable=True),
        sa.Column('os', sa.String(length=50), nullable=True),
        sa.Column('device_type', sa.String(length=20), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])

    op.create_table(
        'page_visits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('path', sa.String(length=255), nullable=False),
        sa.Column('visited_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['user_sessions.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_page_visits_session_id', 'page_visits', ['session_id'])


def downgrade() -> None:
    op.drop_index('ix_page_visits_session_id', table_name='page_visits')
    op.drop_table('page_visits')
    op.drop_index('ix_user_sessions_user_id', table_name='user_sessions')
    op.drop_table('user_sessions')
