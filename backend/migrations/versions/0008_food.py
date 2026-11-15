"""food_items and food_log_entries (story 3.1)

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-16 01:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0008'
down_revision: Union[str, Sequence[str], None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'food_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('source', sa.String(length=16), nullable=False),
        sa.Column('owner_id', sa.Uuid(), nullable=True),
        sa.Column('external_id', sa.String(length=32), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('kcal_per_100g', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('protein_g', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('carbs_g', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('fat_g', sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_food_items_owner_id', 'food_items', ['owner_id'])
    op.create_index('ix_food_items_lower_name', 'food_items', [sa.text('lower(name)')])
    op.create_table(
        'food_log_entries',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('food_item_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('meal', sa.String(length=16), nullable=False),
        sa.Column('grams', sa.Numeric(precision=6, scale=1), nullable=False),
        sa.Column('kcal_per_100g_snapshot', sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_item_id'], ['food_items.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_food_log_entries_user_date', 'food_log_entries', ['user_id', 'date']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_food_log_entries_user_date', table_name='food_log_entries')
    op.drop_table('food_log_entries')
    op.drop_index('ix_food_items_lower_name', table_name='food_items')
    op.drop_index('ix_food_items_owner_id', table_name='food_items')
    op.drop_table('food_items')
