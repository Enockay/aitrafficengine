"""add celery_task_id to schedules

Revision ID: c8f3a6e2b4d1
Revises: f2b8c1a5d9e3
Create Date: 2026-08-11 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c8f3a6e2b4d1'
down_revision: Union[str, None] = 'f2b8c1a5d9e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('schedules', sa.Column('celery_task_id', sa.String(length=155), nullable=True))


def downgrade() -> None:
    op.drop_column('schedules', 'celery_task_id')
