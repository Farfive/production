"""Multinational Stripe payment system

Revision ID: 001_stripe_multinational
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_stripe_multinational'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Create comprehensive multinational payment system tables"""
    
    # Create enum types
    transaction_status_enum = postgresql.ENUM(
        'PENDING', 'PROCESSING', 'AUTHORIZED', 'CAPTURED', 'SUCCEEDED', 
        'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 
        'DISPUTED', 'CHARGEBACK', 'REQUIRES_ACTION', 'REQUIRES_CAPTURE',
        'REQUIRES_CONFIRMATION', 'REQUIRES_PAYMENT_METHOD',
        name='transactionstatus'
    )
    transaction_status_enum.create(op.get_bind())
    
    transaction_type_enum = postgresql.ENUM(
        'ORDER_PAYMENT', 'COMMISSION', 'PAYOUT', 'REFUND', 'DISPUTE_RESOLUTION',
        'CHARGEBACK', 'ADJUSTMENT', 'SUBSCRIPTION', 'INVOICE', 
        'MARKETPLACE_SPLIT', 'ESCROW_RELEASE',
        name='transactiontype'
    )
    transaction_type_enum.create(op.get_bind())
    
    payment_method_enum = postgresql.ENUM(
        'CARD', 'SEPA_DEBIT', 'ACH_DEBIT', 'BANCONTACT', 'IDEAL', 'SOFORT',
        'GIROPAY', 'P24', 'EPS', 'ALIPAY', 'WECHAT_PAY', 'AFTERPAY_CLEARPAY',
        'KLARNA', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL', 'BANK_TRANSFER',
        'CRYPTOCURRENCY', 'OTHER',
        name='paymentmethod'
    )
    payment_method_enum.create(op.get_bind())
    
    payment_region_enum = postgresql.ENUM(
        'US', 'EU', 'UK', 'CA', 'AU', 'SG', 'JP', 'OTHER',
        name='paymentregion'
    )
    payment_region_enum.create(op.get_bind())
    
    connect_account_type_enum = postgresql.ENUM(
        'STANDARD', 'EXPRESS', 'CUSTOM',
        name='connectaccounttype'
    )
    connect_account_type_enum.create(op.get_bind())
    
    subscription_status_enum = postgresql.ENUM(
        'ACTIVE', 'PAST_DUE', 'UNPAID', 'CANCELED', 'INCOMPLETE',
        'INCOMPLETE_EXPIRED', 'TRIALING', 'PAUSED',
        name='subscriptionstatus'
    )
    subscription_status_enum.create(op.get_bind())
    
    # Enhanced Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        
        # Core references
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('quote_id', sa.Integer(), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=True),
        
        # Transaction identification
        sa.Column('transaction_number', sa.String(50), nullable=False, unique=True),
        sa.Column('external_transaction_id', sa.String(255), nullable=True),
        sa.Column('idempotency_key', sa.String(255), nullable=True, unique=True),
        
        # Transaction details
        sa.Column('transaction_type', transaction_type_enum, nullable=False),
        sa.Column('status', transaction_status_enum, nullable=False, default='PENDING'),
        
        # Payment method information
        sa.Column('payment_method_type', payment_method_enum, nullable=True),
        sa.Column('payment_method_details', postgresql.JSON(astext_type=sa.Text()), nullable=True, default={}),
        
        # Regional and currency information
        sa.Column('region', payment_region_enum, nullable=False),
        sa.Column('original_currency', sa.String(3), nullable=False, default='USD'),
        sa.Column('platform_currency', sa.String(3), nullable=False, default='USD'),
        
        # Amounts
        sa.Column('original_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('gross_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('net_amount', sa.Numeric(15, 2), nullable=False),
        
        # Commission and fees
        sa.Column('platform_commission_rate_pct', sa.Numeric(5, 2), default=10.00),
        sa.Column('platform_commission_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('stripe_fee_amount', sa.Numeric(8, 2), default=0.00),
        sa.Column('cross_border_fee_amount', sa.Numeric(8, 2), default=0.00),
        sa.Column('currency_conversion_fee_amount', sa.Numeric(8, 2), default=0.00),
        
        # Tax handling
        sa.Column('tax_rate_pct', sa.Numeric(5, 2), default=0.00),
        sa.Column('tax_amount', sa.Numeric(12, 2), nullable=False, default=0),
        sa.Column('tax_included', sa.Boolean(), default=True),
        sa.Column('tax_jurisdiction', sa.String(50), nullable=True),
        
        # Manufacturer payout
        sa.Column('manufacturer_payout_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('manufacturer_payout_currency', sa.String(3), nullable=False, default='USD'),
        
        # Escrow functionality
        sa.Column('escrow_amount', sa.Numeric(15, 2), default=0.00),
        sa.Column('escrow_release_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('escrow_released_amount', sa.Numeric(15, 2), default=0.00),
        
        # Exchange rates
        sa.Column('exchange_rate', sa.Numeric(10, 6), default=1.000000),
        sa.Column('exchange_rate_timestamp', sa.DateTime(timezone=True), nullable=True),
        
        # Stripe integration
        sa.Column('stripe_payment_intent_id', sa.String(255), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(255), nullable=True),
        sa.Column('stripe_charge_id', sa.String(255), nullable=True),
        sa.Column('stripe_refund_id', sa.String(255), nullable=True),
        sa.Column('stripe_invoice_id', sa.String(255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('stripe_account_id', sa.String(255), nullable=True),
        
        # 3D Secure and SCA
        sa.Column('three_d_secure_status', sa.String(50), nullable=True),
        sa.Column('sca_required', sa.Boolean(), default=False),
        sa.Column('sca_completed', sa.Boolean(), default=False),
        
        # Fraud detection
        sa.Column('fraud_score', sa.Integer(), nullable=True),
        sa.Column('fraud_outcome', sa.String(50), nullable=True),
        
        # Timeline tracking
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('authorized_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payout_initiated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payout_succeeded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payout_failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refund_requested_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refund_processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('refund_amount', sa.Numeric(15, 2), default=0.0),
        
        # Error handling
        sa.Column('failure_reason', sa.String(500), nullable=True),
        sa.Column('failure_code', sa.String(100), nullable=True),
        sa.Column('last_error', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Metadata
        sa.Column('metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True, default={}),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
    )
    
    # Stripe Connect Accounts table
    op.create_table(
        'stripe_connect_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('stripe_account_id', sa.String(255), nullable=False, unique=True),
        sa.Column('account_type', connect_account_type_enum, nullable=False),
        
        # Account status
        sa.Column('charges_enabled', sa.Boolean(), default=False),
        sa.Column('payouts_enabled', sa.Boolean(), default=False),
        sa.Column('details_submitted', sa.Boolean(), default=False),
        
        # Regional information
        sa.Column('country', sa.String(2), nullable=False),
        sa.Column('region', payment_region_enum, nullable=False),
        sa.Column('default_currency', sa.String(3), nullable=False),
        
        # Verification status
        sa.Column('identity_verified', sa.Boolean(), default=False),
        sa.Column('business_verified', sa.Boolean(), default=False),
        
        # Requirements
        sa.Column('currently_due', postgresql.JSON(astext_type=sa.Text()), nullable=True, default=[]),
        sa.Column('eventually_due', postgresql.JSON(astext_type=sa.Text()), nullable=True, default=[]),
        sa.Column('past_due', postgresql.JSON(astext_type=sa.Text()), nullable=True, default=[]),
        
        # Payout settings
        sa.Column('payout_schedule', postgresql.JSON(astext_type=sa.Text()), nullable=True, default={}),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
    )
    
    # Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=True),
        
        # Stripe subscription details
        sa.Column('stripe_subscription_id', sa.String(255), nullable=False, unique=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=False),
        sa.Column('stripe_price_id', sa.String(255), nullable=False),
        
        # Subscription details
        sa.Column('status', subscription_status_enum, nullable=False),
        sa.Column('plan_name', sa.String(100), nullable=False),
        
        # Pricing
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False),
        sa.Column('interval', sa.String(20), nullable=False),
        sa.Column('interval_count', sa.Integer(), default=1),
        
        # Trial
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        
        # Billing
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        
        # Cancellation
        sa.Column('cancel_at_period_end', sa.Boolean(), default=False),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
    )
    
    # Invoices table
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False),
        
        # Invoice details
        sa.Column('invoice_number', sa.String(50), nullable=False, unique=True),
        sa.Column('stripe_invoice_id', sa.String(255), nullable=True, unique=True),
        
        # Amounts
        sa.Column('subtotal', sa.Numeric(15, 2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(12, 2), default=0.00),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False),
        
        # Payment terms
        sa.Column('payment_terms', sa.String(20), nullable=False, default='NET_30'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=False),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, default='DRAFT'),
        
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], ),
    )
    
    # Webhook Events table
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stripe_event_id', sa.String(255), nullable=False, unique=True),
        sa.Column('event_type', sa.String(100), nullable=False),
        
        # Processing status
        sa.Column('processed', sa.Boolean(), default=False),
        sa.Column('processing_attempts', sa.Integer(), default=0),
        
        # Event data
        sa.Column('event_data', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
    )
    
    # Create indexes for performance
    op.create_index('idx_transaction_stripe_payment_intent', 'transactions', ['stripe_payment_intent_id'])
    op.create_index('idx_transaction_region_currency', 'transactions', ['region', 'original_currency'])
    op.create_index('idx_transaction_status_type', 'transactions', ['status', 'transaction_type'])
    op.create_index('idx_transaction_created_at', 'transactions', ['created_at'])
    op.create_index('idx_transaction_client_id', 'transactions', ['client_id'])
    op.create_index('idx_transaction_manufacturer_id', 'transactions', ['manufacturer_id'])
    
    op.create_index('idx_webhook_event_type_processed', 'webhook_events', ['event_type', 'processed'])
    op.create_index('idx_webhook_created_at', 'webhook_events', ['created_at'])
    
    op.create_index('idx_subscription_user_id', 'subscriptions', ['user_id'])
    op.create_index('idx_subscription_stripe_id', 'subscriptions', ['stripe_subscription_id'])
    op.create_index('idx_subscription_status', 'subscriptions', ['status'])
    
    op.create_index('idx_invoice_client_id', 'invoices', ['client_id'])
    op.create_index('idx_invoice_manufacturer_id', 'invoices', ['manufacturer_id'])
    op.create_index('idx_invoice_status', 'invoices', ['status'])
    op.create_index('idx_invoice_due_date', 'invoices', ['due_date'])
    
    op.create_index('idx_connect_account_manufacturer', 'stripe_connect_accounts', ['manufacturer_id'])
    op.create_index('idx_connect_account_stripe_id', 'stripe_connect_accounts', ['stripe_account_id'])


def downgrade():
    """Remove multinational payment system tables"""
    
    # Drop indexes
    op.drop_index('idx_connect_account_stripe_id', 'stripe_connect_accounts')
    op.drop_index('idx_connect_account_manufacturer', 'stripe_connect_accounts')
    op.drop_index('idx_invoice_due_date', 'invoices')
    op.drop_index('idx_invoice_status', 'invoices')
    op.drop_index('idx_invoice_manufacturer_id', 'invoices')
    op.drop_index('idx_invoice_client_id', 'invoices')
    op.drop_index('idx_subscription_status', 'subscriptions')
    op.drop_index('idx_subscription_stripe_id', 'subscriptions')
    op.drop_index('idx_subscription_user_id', 'subscriptions')
    op.drop_index('idx_webhook_created_at', 'webhook_events')
    op.drop_index('idx_webhook_event_type_processed', 'webhook_events')
    op.drop_index('idx_transaction_manufacturer_id', 'transactions')
    op.drop_index('idx_transaction_client_id', 'transactions')
    op.drop_index('idx_transaction_created_at', 'transactions')
    op.drop_index('idx_transaction_status_type', 'transactions')
    op.drop_index('idx_transaction_region_currency', 'transactions')
    op.drop_index('idx_transaction_stripe_payment_intent', 'transactions')
    
    # Drop tables
    op.drop_table('webhook_events')
    op.drop_table('invoices')
    op.drop_table('subscriptions')
    op.drop_table('stripe_connect_accounts')
    op.drop_table('transactions')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
    op.execute('DROP TYPE IF EXISTS connectaccounttype')
    op.execute('DROP TYPE IF EXISTS paymentregion')
    op.execute('DROP TYPE IF EXISTS paymentmethod')
    op.execute('DROP TYPE IF EXISTS transactiontype')
    op.execute('DROP TYPE IF EXISTS transactionstatus') 