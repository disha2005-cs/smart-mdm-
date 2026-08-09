"""add photo binary storage to students

Revision ID: 20260809125652
Revises: 03d174a7ebfb
Create Date: 2026-08-09 12:56:52

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260809125652'
down_revision = '03d174a7ebfb'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns for storing photos in database
    op.add_column('students', sa.Column('photo_data', sa.LargeBinary(), nullable=True))
    op.add_column('students', sa.Column('photo_mime_type', sa.String(), nullable=True))


def downgrade():
    op.drop_column('students', 'photo_mime_type')
    op.drop_column('students', 'photo_data')
