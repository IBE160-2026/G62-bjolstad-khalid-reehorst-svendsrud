"""food_items.barcode with a unique partial index for shared items (story 3.3)

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-16 14:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0010'
down_revision: Union[str, Sequence[str], None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('food_items', sa.Column('barcode', sa.String(length=14), nullable=True))
    op.create_index(
        'uq_food_items_shared_barcode',
        'food_items',
        ['barcode'],
        unique=True,
        postgresql_where=sa.text('owner_id IS NULL'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        'uq_food_items_shared_barcode',
        table_name='food_items',
        postgresql_where=sa.text('owner_id IS NULL'),
    )
    op.drop_column('food_items', 'barcode')
