"""manufacturer asset tables

Revision ID: 9bb45b133c13
Revises: 001
Create Date: 2025-06-21 21:44:57.548604

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9bb45b133c13'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create manufacturer_capabilities table
    op.create_table(
        'manufacturer_capabilities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False, index=True),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('processes', sa.JSON(), nullable=True),
        sa.Column('materials', sa.JSON(), nullable=True),
        sa.Column('tolerance', sa.String(length=100), nullable=True),
        sa.Column('max_size', sa.String(length=100), nullable=True),
        sa.Column('min_wall_thickness', sa.String(length=100), nullable=True),
        sa.Column('shot_capacity', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.Date(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ondelete='CASCADE'),
    )

    # Create manufacturer_equipment table
    op.create_table(
        'manufacturer_equipment',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('manufacturer', sa.String(length=255), nullable=False),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('specifications', sa.JSON(), nullable=True),
        sa.Column('capabilities', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='operational'),
        sa.Column('utilization_rate', sa.Float(), server_default='0'),
        sa.Column('created_at', sa.Date(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ondelete='CASCADE'),
    )

    # Create manufacturer_certifications table
    op.create_table(
        'manufacturer_certifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('issuing_body', sa.String(length=255), nullable=True),
        sa.Column('issue_date', sa.Date(), nullable=True),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('certificate_number', sa.String(length=100), nullable=True),
        sa.Column('scope', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('created_at', sa.Date(), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ondelete='CASCADE'),
    )


def downgrade() -> None:
    op.drop_table('manufacturer_certifications')
    op.drop_table('manufacturer_equipment')
    op.drop_table('manufacturer_capabilities') 