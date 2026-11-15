"""login lockout columns on users (story 1.4)

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-15 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003'
down_revision: Union[str, Sequence[str], None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('failed_login_count', sa.Integer(), server_default='0', nullable=False),
    )
    op.add_column('users', sa.Column('first_failed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'first_failed_at')
    op.drop_column('users', 'failed_login_count')
