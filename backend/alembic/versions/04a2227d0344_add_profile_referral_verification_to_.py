"""add profile, referral, and email verification fields to users

Revision ID: 04a2227d0344
Revises: c35013127e85
Create Date: 2026-08-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '04a2227d0344'
down_revision: Union[str, None] = 'c35013127e85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('company_name', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('phone_country_code', sa.String(length=8), nullable=True))
    op.add_column('users', sa.Column('phone_number', sa.String(length=32), nullable=True))
    op.add_column(
        'users', sa.Column('timezone', sa.String(length=64), nullable=False, server_default='UTC')
    )

    # Added nullable first so existing rows can be backfilled before the NOT NULL
    # constraint is applied — a column can't be added NOT NULL on a non-empty table.
    op.add_column('users', sa.Column('referral_code', sa.String(length=12), nullable=True))
    op.execute(
        "UPDATE users SET referral_code = UPPER(SUBSTRING(MD5(id::text || random()::text) FROM 1 FOR 8)) "
        "WHERE referral_code IS NULL"
    )
    op.alter_column('users', 'referral_code', nullable=False)

    op.add_column('users', sa.Column('referred_by_user_id', sa.UUID(), nullable=True))

    # Python-level default on the model is False (every real registration starts
    # unverified) but the DB default here is true — intentional, so this migration
    # doesn't retroactively lock out users that already exist.
    op.add_column(
        'users', sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default='true')
    )
    op.add_column('users', sa.Column('email_verification_token', sa.String(length=64), nullable=True))
    op.add_column(
        'users', sa.Column('email_verification_sent_at', sa.DateTime(timezone=True), nullable=True)
    )

    op.create_index(
        op.f('ix_users_referral_code'), 'users', ['referral_code'], unique=True
    )
    op.create_index(
        op.f('ix_users_email_verification_token'), 'users', ['email_verification_token'], unique=True
    )
    op.create_foreign_key(
        'fk_users_referred_by_user_id', 'users', 'users', ['referred_by_user_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_users_referred_by_user_id', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_email_verification_token'), table_name='users')
    op.drop_index(op.f('ix_users_referral_code'), table_name='users')
    op.drop_column('users', 'email_verification_sent_at')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'is_email_verified')
    op.drop_column('users', 'referred_by_user_id')
    op.drop_column('users', 'referral_code')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'phone_country_code')
    op.drop_column('users', 'company_name')
