"""create subscriptions and paystack webhook events tables

Revision ID: 9a7e3d1c6f28
Revises: 5b2c8f4e7a91
Create Date: 2026-08-06 16:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '9a7e3d1c6f28'
down_revision: Union[str, None] = '5b2c8f4e7a91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('plan_code', sa.String(length=20), server_default='starter', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='trialing', nullable=False),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paystack_customer_code', sa.String(length=100), nullable=True),
        sa.Column('paystack_subscription_code', sa.String(length=100), nullable=True),
        sa.Column('paystack_authorization_code', sa.Text(), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_table(
        'paystack_webhook_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('reference', sa.String(length=200), nullable=False),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'uq_paystack_events_event_type_reference',
        'paystack_webhook_events',
        ['event_type', 'reference'],
        unique=True,
    )

    # Grandfather every pre-existing user onto an unlimited legacy plan so nobody who's
    # already using the product gets locked out the moment quota enforcement ships.
    op.execute(
        """
        INSERT INTO subscriptions (id, user_id, plan_code, status, current_period_end, created_at, updated_at)
        SELECT gen_random_uuid(), id, 'agency', 'active', NULL, now(), now()
        FROM users
        """
    )


def downgrade() -> None:
    op.drop_index('uq_paystack_events_event_type_reference', table_name='paystack_webhook_events')
    op.drop_table('paystack_webhook_events')
    op.drop_table('subscriptions')
