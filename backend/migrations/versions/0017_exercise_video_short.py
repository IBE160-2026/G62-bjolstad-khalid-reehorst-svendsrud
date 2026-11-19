"""video_short on exercises (YouTube Shorts in a 9:16 player)

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-19 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0017'
down_revision: Union[str, Sequence[str], None] = '0016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'exercises',
        sa.Column('video_short', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('exercises', 'video_short')
