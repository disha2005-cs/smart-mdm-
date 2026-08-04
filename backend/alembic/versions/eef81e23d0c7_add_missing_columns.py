"""add_missing_columns

Revision ID: eef81e23d0c7
Revises: 6b3c98ccefe8
Create Date: 2026-08-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eef81e23d0c7'
down_revision: Union[str, Sequence[str], None] = '6b3c98ccefe8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add missing columns and fix data."""
    # Add severity column to alerts table
    op.add_column('alerts', sa.Column('severity', sa.String(), server_default='LOW', nullable=True))
    
    # Add is_active column to schools table
    op.add_column('schools', sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True))
    
    # Update existing alerts to have proper severity
    op.execute("""
        UPDATE alerts SET severity = 'HIGH' WHERE alert_type IN ('LOW_STOCK', 'CRITICAL_SHORTAGE');
    """)
    op.execute("""
        UPDATE alerts SET severity = 'MEDIUM' WHERE alert_type IN ('INSPECTION', 'MAINTENANCE');
    """)
    op.execute("""
        UPDATE alerts SET severity = 'LOW' WHERE alert_type IN ('HEALTH', 'INFO', 'NOTIFICATION');
    """)
    
    # Standardize attendance status to uppercase
    op.execute("""
        UPDATE attendances SET status = 'PRESENT' WHERE LOWER(status) = 'present';
    """)
    op.execute("""
        UPDATE attendances SET status = 'ABSENT' WHERE LOWER(status) = 'absent';
    """)
    
    # Add indexes for performance
    op.create_index('idx_attendance_date_school', 'attendances', ['date', 'school_id'], unique=False)
    op.create_index('idx_attendance_student', 'attendances', ['student_id', 'date'], unique=False)
    op.create_index('idx_alerts_status', 'alerts', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_alerts_status', table_name='alerts')
    op.drop_index('idx_attendance_student', table_name='attendances')
    op.drop_index('idx_attendance_date_school', table_name='attendances')
    op.drop_column('schools', 'is_active')
    op.drop_column('alerts', 'severity')
