"""add_budget_and_allocation_tables

Revision ID: budget_alloc_001
Revises: inv_cost_001
Create Date: 2026-08-07

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'budget_alloc_001'
down_revision = 'inv_cost_001'
branch_labels = None
depends_on = None


def upgrade():
    # Create budgets table
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('financial_year', sa.String(), nullable=False),
        sa.Column('allocated_amount', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('utilized_amount', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_budgets_id'), 'budgets', ['id'], unique=False)
    
    # Create food_allocations table
    op.create_table(
        'food_allocations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('school_id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('allocation_date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED', name='allocationstatus'), nullable=True, server_default='PENDING'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_food_allocations_id'), 'food_allocations', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_food_allocations_id'), table_name='food_allocations')
    op.drop_table('food_allocations')
    op.drop_index(op.f('ix_budgets_id'), table_name='budgets')
    op.drop_table('budgets')
