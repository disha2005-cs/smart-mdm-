"""add_inventory_cost_fields

Revision ID: inv_cost_001
Revises: f32e6fe74f1f
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'inv_cost_001'
down_revision = 'f32e6fe74f1f'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to inventory table
    op.add_column('inventory', sa.Column('category', sa.String(), nullable=True))
    op.add_column('inventory', sa.Column('supplier', sa.String(), nullable=True))
    op.add_column('inventory', sa.Column('cost_per_unit', sa.Float(), nullable=True))
    
    # Set default category for existing records
    op.execute("UPDATE inventory SET category = 'Other' WHERE category IS NULL")


def downgrade():
    op.drop_column('inventory', 'cost_per_unit')
    op.drop_column('inventory', 'supplier')
    op.drop_column('inventory', 'category')
