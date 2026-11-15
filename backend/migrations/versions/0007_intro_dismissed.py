"""intro_dismissed_at on users (story 2.3)

Users who already have a profile finished onboarding before the intro existed, so they
are marked as dismissed at migration time and never see the first-run intro.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-15 23:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007'
down_revision: Union[str, Sequence[str], None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users', sa.Column('intro_dismissed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.execute(
        'UPDATE users SET intro_dismissed_at = now() '
        'WHERE id IN (SELECT user_id FROM profiles)'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'intro_dismissed_at')
