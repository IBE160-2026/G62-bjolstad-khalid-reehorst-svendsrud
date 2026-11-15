"""profiles table: body data and the stored daily target (story 2.1)

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-15 22:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0006'
down_revision: Union[str, Sequence[str], None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'profiles',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('sex', sa.String(length=16), nullable=False),
        sa.Column('weight_kg', sa.Numeric(precision=4, scale=1), nullable=False),
        sa.Column('height_cm', sa.Integer(), nullable=False),
        sa.Column('age', sa.Integer(), nullable=False),
        sa.Column('activity_level', sa.String(length=32), nullable=False),
        sa.Column('goal', sa.String(length=16), nullable=False),
        sa.Column('target_kcal', sa.Integer(), nullable=False),
        sa.Column('floor_applied', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('profiles')
