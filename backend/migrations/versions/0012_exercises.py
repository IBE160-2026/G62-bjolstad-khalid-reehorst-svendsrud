"""equipment, muscle_groups, exercises and their join tables (story 4.1)

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-16 20:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0012'
down_revision: Union[str, Sequence[str], None] = '0011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'equipment',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('slug', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_table(
        'muscle_groups',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('slug', sa.String(length=32), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_table(
        'exercises',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('slug', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('level', sa.String(length=16), nullable=False),
        sa.Column('type', sa.String(length=8), nullable=False),
        sa.Column('steps', sa.JSON(), nullable=False),
        sa.Column('video_id', sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "level IN ('beginner', 'intermediate', 'advanced')", name='ck_exercises_level'
        ),
        sa.CheckConstraint("type IN ('reps', 'time')", name='ck_exercises_type'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )
    op.create_table(
        'exercise_equipment',
        sa.Column('exercise_id', sa.Uuid(), nullable=False),
        sa.Column('equipment_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['equipment_id'], ['equipment.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('exercise_id', 'equipment_id'),
    )
    op.create_table(
        'exercise_muscle_groups',
        sa.Column('exercise_id', sa.Uuid(), nullable=False),
        sa.Column('muscle_group_id', sa.Uuid(), nullable=False),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.CheckConstraint(
            "role IN ('primary', 'secondary')", name='ck_exercise_muscle_groups_role'
        ),
        sa.ForeignKeyConstraint(['exercise_id'], ['exercises.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['muscle_group_id'], ['muscle_groups.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('exercise_id', 'muscle_group_id'),
    )
    op.create_index(
        'uq_exercise_muscle_groups_primary',
        'exercise_muscle_groups',
        ['exercise_id'],
        unique=True,
        postgresql_where=sa.text("role = 'primary'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_exercise_muscle_groups_primary', table_name='exercise_muscle_groups')
    op.drop_table('exercise_muscle_groups')
    op.drop_table('exercise_equipment')
    op.drop_table('exercises')
    op.drop_table('muscle_groups')
    op.drop_table('equipment')
