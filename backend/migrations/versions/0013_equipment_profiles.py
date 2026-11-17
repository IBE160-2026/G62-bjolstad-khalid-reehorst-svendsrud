"""equipment_profiles and equipment_profile_items (story 4.2)

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-17 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0013'
down_revision: Union[str, Sequence[str], None] = '0012'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'equipment_profiles',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=40), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_equipment_profiles_user_id'), 'equipment_profiles', ['user_id'], unique=False
    )
    op.create_index(
        'uq_equipment_profiles_user_name',
        'equipment_profiles',
        ['user_id', sa.text('lower(name)')],
        unique=True,
    )
    op.create_table(
        'equipment_profile_items',
        sa.Column('profile_id', sa.Uuid(), nullable=False),
        sa.Column('equipment_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ['profile_id'], ['equipment_profiles.id'], ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(['equipment_id'], ['equipment.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('profile_id', 'equipment_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('equipment_profile_items')
    op.drop_index('uq_equipment_profiles_user_name', table_name='equipment_profiles')
    op.drop_index(op.f('ix_equipment_profiles_user_id'), table_name='equipment_profiles')
    op.drop_table('equipment_profiles')
