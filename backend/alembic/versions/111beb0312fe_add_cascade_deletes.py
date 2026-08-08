"""add_cascade_deletes

Revision ID: 111beb0312fe
Revises: eef81e23d0c7
Create Date: 2026-08-08 18:33:35.152777

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '111beb0312fe'
down_revision: Union[str, Sequence[str], None] = 'eef81e23d0c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add CASCADE deletes to foreign keys."""
    
    # Drop and recreate foreign key constraints with CASCADE
    
    # 1. users.school_id
    op.drop_constraint('users_school_id_fkey', 'users', type_='foreignkey')
    op.create_foreign_key('users_school_id_fkey', 'users', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    # 2. students.school_id
    op.drop_constraint('students_school_id_fkey', 'students', type_='foreignkey')
    op.create_foreign_key('students_school_id_fkey', 'students', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    # 3. attendances.school_id and student_id
    op.drop_constraint('attendances_school_id_fkey', 'attendances', type_='foreignkey')
    op.create_foreign_key('attendances_school_id_fkey', 'attendances', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    op.drop_constraint('attendances_student_id_fkey', 'attendances', type_='foreignkey')
    op.create_foreign_key('attendances_student_id_fkey', 'attendances', 'students', ['student_id'], ['id'], ondelete='CASCADE')
    
    # 4. alerts.school_id
    op.drop_constraint('alerts_school_id_fkey', 'alerts', type_='foreignkey')
    op.create_foreign_key('alerts_school_id_fkey', 'alerts', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    # 5. inventory.school_id
    op.drop_constraint('inventory_school_id_fkey', 'inventory', type_='foreignkey')
    op.create_foreign_key('inventory_school_id_fkey', 'inventory', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    # 6. daily_meals.school_id
    op.drop_constraint('daily_meals_school_id_fkey', 'daily_meals', type_='foreignkey')
    op.create_foreign_key('daily_meals_school_id_fkey', 'daily_meals', 'schools', ['school_id'], ['id'], ondelete='CASCADE')
    
    # 7. face_encodings.student_id
    op.drop_constraint('face_encodings_student_id_fkey', 'face_encodings', type_='foreignkey')
    op.create_foreign_key('face_encodings_student_id_fkey', 'face_encodings', 'students', ['student_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema - Remove CASCADE deletes from foreign keys."""
    
    # Revert foreign key constraints back to default (no CASCADE)
    
    op.drop_constraint('face_encodings_student_id_fkey', 'face_encodings', type_='foreignkey')
    op.create_foreign_key('face_encodings_student_id_fkey', 'face_encodings', 'students', ['student_id'], ['id'])
    
    op.drop_constraint('daily_meals_school_id_fkey', 'daily_meals', type_='foreignkey')
    op.create_foreign_key('daily_meals_school_id_fkey', 'daily_meals', 'schools', ['school_id'], ['id'])
    
    op.drop_constraint('inventory_school_id_fkey', 'inventory', type_='foreignkey')
    op.create_foreign_key('inventory_school_id_fkey', 'inventory', 'schools', ['school_id'], ['id'])
    
    op.drop_constraint('alerts_school_id_fkey', 'alerts', type_='foreignkey')
    op.create_foreign_key('alerts_school_id_fkey', 'alerts', 'schools', ['school_id'], ['id'])
    
    op.drop_constraint('attendances_student_id_fkey', 'attendances', type_='foreignkey')
    op.create_foreign_key('attendances_student_id_fkey', 'attendances', 'students', ['student_id'], ['id'])
    
    op.drop_constraint('attendances_school_id_fkey', 'attendances', type_='foreignkey')
    op.create_foreign_key('attendances_school_id_fkey', 'attendances', 'schools', ['school_id'], ['id'])
    
    op.drop_constraint('students_school_id_fkey', 'students', type_='foreignkey')
    op.create_foreign_key('students_school_id_fkey', 'students', 'schools', ['school_id'], ['id'])
    
    op.drop_constraint('users_school_id_fkey', 'users', type_='foreignkey')
    op.create_foreign_key('users_school_id_fkey', 'users', 'schools', ['school_id'], ['id'])
