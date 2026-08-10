"""add subscription_plans table

Revision ID: a1c3e9f4b7d2
Revises: dd0eb76119a8
Create Date: 2026-08-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c3e9f4b7d2'
down_revision: Union[str, None] = 'dd0eb76119a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


plans_table = sa.table(
    'subscription_plans',
    sa.column('code', sa.String),
    sa.column('name', sa.String),
    sa.column('price_usd', sa.Integer),
    sa.column('max_sites', sa.Integer),
    sa.column('max_posts_per_month', sa.Integer),
    sa.column('max_flyers_per_month', sa.Integer),
    sa.column('schedule_horizon_days', sa.Integer),
    sa.column('paystack_plan_code', sa.String),
)


def upgrade() -> None:
    op.create_table(
        'subscription_plans',
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('price_usd', sa.Integer(), nullable=False),
        sa.Column('max_sites', sa.Integer(), nullable=False),
        sa.Column('max_posts_per_month', sa.Integer(), nullable=False),
        sa.Column('max_flyers_per_month', sa.Integer(), nullable=False),
        sa.Column('schedule_horizon_days', sa.Integer(), nullable=False),
        sa.Column('paystack_plan_code', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('code'),
    )
    # Seed with the tiers that were previously hardcoded in services/plans.py, so
    # existing subscriptions/payments referencing these plan_codes keep resolving.
    op.bulk_insert(
        plans_table,
        [
            {
                'code': 'starter', 'name': 'Starter', 'price_usd': 20, 'max_sites': 1,
                'max_posts_per_month': 30, 'max_flyers_per_month': 10, 'schedule_horizon_days': 7,
                'paystack_plan_code': 'PLN_l2fi7r3inv28c4f',
            },
            {
                'code': 'growth', 'name': 'Growth', 'price_usd': 49, 'max_sites': 3,
                'max_posts_per_month': 120, 'max_flyers_per_month': 40, 'schedule_horizon_days': 14,
                'paystack_plan_code': 'PLN_evyy306bynu6szd',
            },
            {
                'code': 'agency', 'name': 'Agency', 'price_usd': 149, 'max_sites': 10,
                'max_posts_per_month': 400, 'max_flyers_per_month': 150, 'schedule_horizon_days': 30,
                'paystack_plan_code': 'PLN_8lgzcohetotmaws',
            },
        ],
    )


def downgrade() -> None:
    op.drop_table('subscription_plans')
