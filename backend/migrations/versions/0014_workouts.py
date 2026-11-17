"""workouts and workout_exercises (story 5.1)

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-17 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0014'
down_revision: Union[str, Sequence[str], None] = '0013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'workouts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_workouts_user_id'), 'workouts', ['user_id'], unique=False)
    # At most one unfinished workout per user.
    op.create_index(
        'uq_workouts_user_unfinished',
        'workouts',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text('finished_at IS NULL'),
    )
    op.create_table(
        'workout_exercises',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('workout_id', sa.Uuid(), nullable=False),
        sa.Column('exercise_id', sa.Uuid(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['workout_id'], ['workouts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workout_id', 'exercise_id', name='uq_workout_exercises_exercise'),
    )
    op.create_index(
        op.f('ix_workout_exercises_workout_id'), 'workout_exercises', ['workout_id'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_workout_exercises_workout_id'), table_name='workout_exercises')
    op.drop_table('workout_exercises')
    op.drop_index('uq_workouts_user_unfinished', table_name='workouts')
    op.drop_index(op.f('ix_workouts_user_id'), table_name='workouts')
    op.drop_table('workouts')
