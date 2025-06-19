"""final order & quote fix

Revision ID: 003_final_order_quote_fix
Revises: 002_add_websocket_tables
Create Date: 2025-06-18
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column, text

# revision identifiers, used by Alembic.
revision = '003_final_order_quote_fix'
down_revision = '002_add_websocket_tables'
branch_labels = None
depends_on = None

def upgrade():
    # 1) Add quote_id column to invoices -----------------------------
    op.add_column('invoices', sa.Column('quote_id', sa.Integer(), nullable=True))
    op.create_index('ix_invoices_quote_id', 'invoices', ['quote_id'])
    op.create_foreign_key(
        'fk_invoices_quote_id',
        source_table='invoices',
        referent_table='quotes',
        local_cols=['quote_id'],
        remote_cols=['id'],
        ondelete='SET NULL',
    )

    # 2) Back-fill invoices.quote_id based on orders.selected_quote_id
    #    (works only when invoices.order_id is present)
    op.execute(
        text(
            """
            UPDATE invoices
            SET quote_id = orders.selected_quote_id
            FROM orders
            WHERE invoices.order_id = orders.id
              AND orders.selected_quote_id IS NOT NULL
              AND invoices.quote_id IS NULL
            """
        )
    )

    # 3) Ensure orders.selected_quote_id integrity -------------------
    #    If any selected_quote_id does not exist in quotes, set NULL.
    op.execute(
        text(
            """
            UPDATE orders
            SET selected_quote_id = NULL
            WHERE selected_quote_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM quotes q WHERE q.id = orders.selected_quote_id
              )
            """
        )
    )

    # 4) Recreate FK orders.selected_quote_id with ON DELETE SET NULL
    op.drop_constraint('orders_selected_quote_id_fkey', 'orders', type_='foreignkey', if_exists=True)
    op.create_foreign_key(
        'fk_orders_selected_quote_id',
        source_table='orders',
        referent_table='quotes',
        local_cols=['selected_quote_id'],
        remote_cols=['id'],
        ondelete='SET NULL',
    )

    # 5) Composite index on production_quotes ------------------------
    op.create_index(
        'ix_production_quotes_active_public_priority_created',
        'production_quotes',
        ['is_active', 'is_public', 'priority_level', 'created_at']
    )

    # 6) Drop legacy tables if they exist ----------------------------
    for legacy in [
        'legacy_production_quotes',
        'legacy_production_quote_inquiries',
        'legacy_production_quote_views'
    ]:
        op.execute(text(f'DROP TABLE IF EXISTS {legacy} CASCADE'))


def downgrade():
    # Revert composite index
    op.drop_index('ix_production_quotes_active_public_priority_created', table_name='production_quotes')

    # Revert orders FK
    op.drop_constraint('fk_orders_selected_quote_id', 'orders', type_='foreignkey')

    # We cannot recover old behavior easily; create simple FK without cascade
    op.create_foreign_key(
        'orders_selected_quote_id_fkey',
        source_table='orders',
        referent_table='quotes',
        local_cols=['selected_quote_id'],
        remote_cols=['id']
    )

    # invoices modifications
    op.drop_constraint('fk_invoices_quote_id', 'invoices', type_='foreignkey')
    op.drop_index('ix_invoices_quote_id', table_name='invoices')
    op.drop_column('invoices', 'quote_id') 