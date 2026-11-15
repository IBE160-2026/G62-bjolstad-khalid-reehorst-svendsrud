"""deleted_at on users and a partial unique email index (story 1.6)

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-15 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005'
down_revision: Union[str, Sequence[str], None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    # Only active accounts must have a unique email, so a deleted user's email can register again.
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_index(
        op.f('ix_users_email'),
        'users',
        ['email'],
        unique=True,
        postgresql_where=sa.text('deleted_at IS NULL'),
    )


def downgrade() -> None:
    """Downgrade schema.

    Soft-deleted accounts are hard-deleted first (their sessions cascade): without
    `deleted_at` they would become active, loginable accounts again, and their emails
    could clash with the full unique index.
    """
    op.execute('DELETE FROM users WHERE deleted_at IS NOT NULL')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.drop_column('users', 'deleted_at')
