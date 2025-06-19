"""Initial database schema for B2B Manufacturing Marketplace

Revision ID: 001
Revises: 
Create Date: 2024-12-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM types
    user_role_enum = postgresql.ENUM('CLIENT', 'MANUFACTURER', 'ADMIN', name='userrole')
    user_role_enum.create(op.get_bind())
    
    registration_status_enum = postgresql.ENUM(
        'PENDING_EMAIL_VERIFICATION', 'ACTIVE', 'PROFILE_INCOMPLETE', 'SUSPENDED', 
        name='registrationstatus'
    )
    registration_status_enum.create(op.get_bind())
    
    order_status_enum = postgresql.ENUM(
        'DRAFT', 'ACTIVE', 'QUOTED', 'ACCEPTED', 'IN_PRODUCTION', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED',
        name='orderstatus'
    )
    order_status_enum.create(op.get_bind())
    
    priority_enum = postgresql.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT', name='priority')
    priority_enum.create(op.get_bind())
    
    budget_type_enum = postgresql.ENUM('FIXED', 'RANGE', 'NEGOTIABLE', name='budgettype')
    budget_type_enum.create(op.get_bind())
    
    quote_status_enum = postgresql.ENUM(
        'DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN', 'SUPERSEDED',
        name='quotestatus'
    )
    quote_status_enum.create(op.get_bind())
    
    transaction_status_enum = postgresql.ENUM(
        'PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SUCCEEDED', 'FAILED', 
        'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED', 'CHARGEBACK',
        name='transactionstatus'
    )
    transaction_status_enum.create(op.get_bind())
    
    transaction_type_enum = postgresql.ENUM(
        'ORDER_PAYMENT', 'COMMISSION', 'PAYOUT', 'REFUND', 'DISPUTE_RESOLUTION', 'CHARGEBACK', 'ADJUSTMENT',
        name='transactiontype'
    )
    transaction_type_enum.create(op.get_bind())
    
    payment_method_enum = postgresql.ENUM(
        'CREDIT_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CRYPTOCURRENCY', 'OTHER',
        name='paymentmethod'
    )
    payment_method_enum.create(op.get_bind())

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        
        # Company information
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('nip', sa.String(length=20), nullable=True),
        sa.Column('company_address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        
        # User status and role
        sa.Column('role', user_role_enum, nullable=False),
        sa.Column('registration_status', registration_status_enum, nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        
        # GDPR compliance
        sa.Column('consent_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_processing_consent', sa.Boolean(), nullable=False),
        sa.Column('marketing_consent', sa.Boolean(), nullable=False),
        sa.Column('gdpr_data_export_requested', sa.DateTime(timezone=True), nullable=True),
        sa.Column('gdpr_data_deletion_requested', sa.DateTime(timezone=True), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        
        # Email verification
        sa.Column('email_verified', sa.Boolean(), nullable=False),
        sa.Column('email_verification_token', sa.String(length=255), nullable=True),
        sa.Column('email_verification_sent_at', sa.DateTime(timezone=True), nullable=True),
        
        # Password reset
        sa.Column('password_reset_token', sa.String(length=255), nullable=True),
        sa.Column('password_reset_expires', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for users table
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_nip', 'users', ['nip'])
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_registration_status', 'users', ['registration_status'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    op.create_index('ix_users_created_at', 'users', ['created_at'])
    op.create_index('ix_users_last_login', 'users', ['last_login'])
    op.create_index('ix_users_email_verified', 'users', ['email_verified'])

    # Create manufacturers table
    op.create_table('manufacturers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        
        # Company information
        sa.Column('business_name', sa.String(length=255), nullable=True),
        sa.Column('business_description', sa.Text(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        
        # Geographic information
        sa.Column('country', sa.String(length=2), nullable=False),
        sa.Column('state_province', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('postal_code', sa.String(length=20), nullable=True),
        sa.Column('latitude', sa.Numeric(precision=10, scale=8), nullable=True),
        sa.Column('longitude', sa.Numeric(precision=11, scale=8), nullable=True),
        
        # Capabilities matrix
        sa.Column('capabilities', sa.JSON(), nullable=False),
        
        # Production capacity
        sa.Column('production_capacity_monthly', sa.Integer(), nullable=True),
        sa.Column('capacity_utilization_pct', sa.Float(), nullable=True),
        sa.Column('min_order_quantity', sa.Integer(), nullable=True),
        sa.Column('max_order_quantity', sa.Integer(), nullable=True),
        sa.Column('min_order_value_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('max_order_value_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        
        # Lead times
        sa.Column('standard_lead_time_days', sa.Integer(), nullable=True),
        sa.Column('rush_order_available', sa.Boolean(), nullable=True),
        sa.Column('rush_order_lead_time_days', sa.Integer(), nullable=True),
        sa.Column('rush_order_surcharge_pct', sa.Float(), nullable=True),
        
        # Quality and certifications
        sa.Column('quality_certifications', sa.JSON(), nullable=True),
        
        # Portfolio and experience
        sa.Column('years_in_business', sa.Integer(), nullable=True),
        sa.Column('number_of_employees', sa.Integer(), nullable=True),
        sa.Column('annual_revenue_range', sa.String(length=50), nullable=True),
        sa.Column('portfolio_images', sa.JSON(), nullable=True),
        sa.Column('case_studies', sa.JSON(), nullable=True),
        
        # Business metrics
        sa.Column('overall_rating', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('quality_rating', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('delivery_rating', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('communication_rating', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('price_competitiveness_rating', sa.Numeric(precision=3, scale=2), nullable=True),
        
        sa.Column('total_orders_completed', sa.Integer(), nullable=True),
        sa.Column('total_orders_in_progress', sa.Integer(), nullable=True),
        sa.Column('total_revenue_pln', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('on_time_delivery_rate', sa.Float(), nullable=True),
        sa.Column('repeat_customer_rate', sa.Float(), nullable=True),
        
        # Payment and financial
        sa.Column('stripe_account_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_onboarding_completed', sa.Boolean(), nullable=True),
        sa.Column('payment_terms', sa.String(length=100), nullable=True),
        
        # Status and verification
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('verification_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('profile_completion_pct', sa.Float(), nullable=True),
        sa.Column('last_activity_date', sa.DateTime(timezone=True), nullable=True),
        
        # Preferences
        sa.Column('preferred_order_size', sa.String(length=50), nullable=True),
        sa.Column('preferred_industries', sa.JSON(), nullable=True),
        sa.Column('accepts_international_orders', sa.Boolean(), nullable=True),
        sa.Column('preferred_communication_method', sa.String(length=50), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('stripe_account_id')
    )
    
    # Create indexes for manufacturers table
    op.create_index('ix_manufacturers_user_id', 'manufacturers', ['user_id'])
    op.create_index('ix_manufacturers_country', 'manufacturers', ['country'])
    op.create_index('ix_manufacturers_state_province', 'manufacturers', ['state_province'])
    op.create_index('ix_manufacturers_city', 'manufacturers', ['city'])
    op.create_index('ix_manufacturers_postal_code', 'manufacturers', ['postal_code'])
    op.create_index('ix_manufacturers_overall_rating', 'manufacturers', ['overall_rating'])
    op.create_index('ix_manufacturers_total_orders_completed', 'manufacturers', ['total_orders_completed'])
    op.create_index('ix_manufacturers_stripe_onboarding_completed', 'manufacturers', ['stripe_onboarding_completed'])
    op.create_index('ix_manufacturers_is_active', 'manufacturers', ['is_active'])
    op.create_index('ix_manufacturers_is_verified', 'manufacturers', ['is_verified'])
    op.create_index('ix_manufacturers_last_activity_date', 'manufacturers', ['last_activity_date'])
    op.create_index('ix_manufacturers_created_at', 'manufacturers', ['created_at'])

    # Create orders table
    op.create_table('orders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        
        # Order identification
        sa.Column('order_number', sa.String(length=50), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        
        # Technical requirements
        sa.Column('technical_requirements', sa.JSON(), nullable=False),
        
        # Quantity and production
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('quantity_unit', sa.String(length=20), nullable=True),
        sa.Column('prototype_required', sa.Boolean(), nullable=True),
        sa.Column('prototype_quantity', sa.Integer(), nullable=True),
        
        # Budget information
        sa.Column('budget_type', budget_type_enum, nullable=True),
        sa.Column('budget_min_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('budget_max_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('budget_fixed_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('budget_per_unit', sa.Boolean(), nullable=True),
        
        # Timeline and delivery
        sa.Column('delivery_deadline', sa.DateTime(timezone=True), nullable=False),
        sa.Column('delivery_flexibility_days', sa.Integer(), nullable=True),
        sa.Column('preferred_delivery_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rush_order', sa.Boolean(), nullable=True),
        
        # Geographic preferences
        sa.Column('preferred_country', sa.String(length=2), nullable=True),
        sa.Column('preferred_state_province', sa.String(length=100), nullable=True),
        sa.Column('preferred_city', sa.String(length=100), nullable=True),
        sa.Column('max_distance_km', sa.Integer(), nullable=True),
        sa.Column('international_shipping_ok', sa.Boolean(), nullable=True),
        
        # Priority and categorization
        sa.Column('priority', priority_enum, nullable=True),
        sa.Column('industry_category', sa.String(length=100), nullable=True),
        sa.Column('project_category', sa.String(length=100), nullable=True),
        
        # File attachments
        sa.Column('attachments', sa.JSON(), nullable=True),
        
        # Status and workflow
        sa.Column('status', order_status_enum, nullable=True),
        
        # Matching and selection
        sa.Column('selected_manufacturer_id', sa.Integer(), nullable=True),
        sa.Column('selected_quote_id', sa.Integer(), nullable=True),
        sa.Column('matching_completed_at', sa.DateTime(timezone=True), nullable=True),
        
        # Feedback and communication
        sa.Column('client_feedback', sa.Text(), nullable=True),
        sa.Column('client_rating', sa.Integer(), nullable=True),
        sa.Column('manufacturer_feedback', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['selected_manufacturer_id'], ['manufacturers.id'], ),
        sa.UniqueConstraint('order_number')
    )
    
    # Create indexes for orders table
    op.create_index('ix_orders_client_id', 'orders', ['client_id'])
    op.create_index('ix_orders_order_number', 'orders', ['order_number'])
    op.create_index('ix_orders_title', 'orders', ['title'])
    op.create_index('ix_orders_quantity', 'orders', ['quantity'])
    op.create_index('ix_orders_delivery_deadline', 'orders', ['delivery_deadline'])
    op.create_index('ix_orders_rush_order', 'orders', ['rush_order'])
    op.create_index('ix_orders_preferred_country', 'orders', ['preferred_country'])
    op.create_index('ix_orders_priority', 'orders', ['priority'])
    op.create_index('ix_orders_industry_category', 'orders', ['industry_category'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_created_at', 'orders', ['created_at'])

    # Create quotes table
    op.create_table('quotes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False),
        
        # Quote identification
        sa.Column('quote_number', sa.String(length=50), nullable=True),
        
        # Detailed pricing breakdown
        sa.Column('pricing_breakdown', sa.JSON(), nullable=False),
        
        # Pricing summary
        sa.Column('material_cost_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('labor_cost_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('overhead_cost_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tooling_cost_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('shipping_cost_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('other_costs_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        
        sa.Column('subtotal_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tax_rate_pct', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('tax_amount_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('total_price_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('price_per_unit_pln', sa.Numeric(precision=12, scale=2), nullable=True),
        
        # Delivery and timeline
        sa.Column('lead_time_days', sa.Integer(), nullable=False),
        sa.Column('production_time_days', sa.Integer(), nullable=True),
        sa.Column('shipping_time_days', sa.Integer(), nullable=True),
        sa.Column('delivery_method', sa.String(length=100), nullable=True),
        sa.Column('delivery_timeline', sa.JSON(), nullable=True),
        
        # Terms and conditions
        sa.Column('payment_terms', sa.Text(), nullable=True),
        sa.Column('warranty_period_days', sa.Integer(), nullable=True),
        sa.Column('warranty_description', sa.Text(), nullable=True),
        
        # Capabilities
        sa.Column('manufacturing_process', sa.String(length=100), nullable=True),
        sa.Column('quality_certifications_applicable', sa.JSON(), nullable=True),
        sa.Column('special_capabilities_used', sa.JSON(), nullable=True),
        
        # Additional information
        sa.Column('technical_notes', sa.Text(), nullable=True),
        sa.Column('client_message', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        
        # Alternatives and options
        sa.Column('alternative_materials', sa.JSON(), nullable=True),
        sa.Column('alternative_processes', sa.JSON(), nullable=True),
        sa.Column('volume_discounts', sa.JSON(), nullable=True),
        
        # Validity and status
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', quote_status_enum, nullable=True),
        
        # Client interaction tracking
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('viewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
        sa.UniqueConstraint('quote_number')
    )
    
    # Create indexes for quotes table
    op.create_index('ix_quotes_order_id', 'quotes', ['order_id'])
    op.create_index('ix_quotes_manufacturer_id', 'quotes', ['manufacturer_id'])
    op.create_index('ix_quotes_quote_number', 'quotes', ['quote_number'])
    op.create_index('ix_quotes_valid_until', 'quotes', ['valid_until'])
    op.create_index('ix_quotes_status', 'quotes', ['status'])

    # Create transactions table
    op.create_table('transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('quote_id', sa.Integer(), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False),
        
        # Transaction identification
        sa.Column('transaction_number', sa.String(length=50), nullable=True),
        sa.Column('external_transaction_id', sa.String(length=255), nullable=True),
        
        # Transaction details
        sa.Column('transaction_type', transaction_type_enum, nullable=False),
        sa.Column('status', transaction_status_enum, nullable=True),
        
        # Payment method
        sa.Column('payment_method_type', payment_method_enum, nullable=True),
        sa.Column('payment_method_details', sa.JSON(), nullable=True),
        
        # Amount breakdown
        sa.Column('gross_amount_pln', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('platform_commission_rate_pct', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('platform_commission_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        
        # Tax handling
        sa.Column('tax_rate_pct', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('tax_amount_pln', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('tax_included', sa.Boolean(), nullable=True),
        
        # Net amounts
        sa.Column('net_amount_to_manufacturer_pln', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('processing_fee_pln', sa.Numeric(precision=8, scale=2), nullable=True),
        
        # Escrow functionality
        sa.Column('funds_held_in_escrow_pln', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('escrow_release_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('escrow_released_pln', sa.Numeric(precision=15, scale=2), nullable=True),
        
        # Commission tracking
        sa.Column('commission_breakdown', sa.JSON(), nullable=True),
        
        # Stripe integration
        sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_refund_id', sa.String(length=255), nullable=True),
        
        # Currency handling
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('exchange_rate', sa.Numeric(precision=10, scale=6), nullable=True),
        
        # Additional tracking
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
        sa.UniqueConstraint('transaction_number')
    )
    
    # Create indexes for transactions table
    op.create_index('ix_transactions_order_id', 'transactions', ['order_id'])
    op.create_index('ix_transactions_quote_id', 'transactions', ['quote_id'])
    op.create_index('ix_transactions_client_id', 'transactions', ['client_id'])
    op.create_index('ix_transactions_manufacturer_id', 'transactions', ['manufacturer_id'])
    op.create_index('ix_transactions_transaction_number', 'transactions', ['transaction_number'])
    op.create_index('ix_transactions_external_transaction_id', 'transactions', ['external_transaction_id'])
    op.create_index('ix_transactions_transaction_type', 'transactions', ['transaction_type'])
    op.create_index('ix_transactions_status', 'transactions', ['status'])

    # Create additional composite indexes for performance
    op.create_index('ix_orders_status_created_at', 'orders', ['status', 'created_at'])
    op.create_index('ix_orders_client_status', 'orders', ['client_id', 'status'])
    op.create_index('ix_quotes_order_status', 'quotes', ['order_id', 'status'])
    op.create_index('ix_manufacturers_location', 'manufacturers', ['country', 'city'])
    op.create_index('ix_manufacturers_active_verified', 'manufacturers', ['is_active', 'is_verified'])
    op.create_index('ix_transactions_order_type', 'transactions', ['order_id', 'transaction_type'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('transactions')
    op.drop_table('quotes')
    op.drop_table('orders')
    op.drop_table('manufacturers')
    op.drop_table('users')
    
    # Drop ENUM types
    postgresql.ENUM(name='paymentmethod').drop(op.get_bind())
    postgresql.ENUM(name='transactiontype').drop(op.get_bind())
    postgresql.ENUM(name='transactionstatus').drop(op.get_bind())
    postgresql.ENUM(name='quotestatus').drop(op.get_bind())
    postgresql.ENUM(name='budgettype').drop(op.get_bind())
    postgresql.ENUM(name='priority').drop(op.get_bind())
    postgresql.ENUM(name='orderstatus').drop(op.get_bind())
    postgresql.ENUM(name='registrationstatus').drop(op.get_bind())
    postgresql.ENUM(name='userrole').drop(op.get_bind()) 