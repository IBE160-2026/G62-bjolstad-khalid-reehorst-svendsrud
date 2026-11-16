"""food_items.serving_size_g (story 3.2)

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-16 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0009'
down_revision: Union[str, Sequence[str], None] = '0008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'food_items',
        sa.Column('serving_size_g', sa.Numeric(precision=6, scale=1), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('food_items', 'serving_size_g')
