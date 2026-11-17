"""sets (story 5.2)

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-17 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0015'
down_revision: Union[str, Sequence[str], None] = '0014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'sets',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('workout_exercise_id', sa.Uuid(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('reps', sa.Integer(), nullable=True),
        sa.Column('weight_kg', sa.Numeric(5, 2), nullable=True),
        sa.Column('seconds', sa.Integer(), nullable=True),
        sa.Column('done', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['workout_exercise_id'], ['workout_exercises.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_sets_workout_exercise_id'), 'sets', ['workout_exercise_id'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_sets_workout_exercise_id'), table_name='sets')
    op.drop_table('sets')
