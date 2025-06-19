"""
 Advanced Financial Management Models

 Database models for comprehensive financial operations including
 invoicing, escrow services, financing, payments, and financial analytics.
 """
# pylint: disable=not-callable

# Standard library imports
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Dict, List, Any, Optional

# Third-party imports
from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Boolean, ForeignKey, JSON, Text,
    Numeric, Enum as SQLEnum, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
from sqlalchemy.orm import foreign

# Local imports
from app.core.database import Base
from app.models.producer import Manufacturer  # for relationship join


class InvoiceStatus(PyEnum):
    """Invoice status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    SENT = "sent"
    VIEWED = "viewed"
    APPROVED = "approved"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(PyEnum):
    """Payment status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    DISPUTED = "disputed"


class PaymentMethod(PyEnum):
    """Payment method enumeration."""
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    DIGITAL_WALLET = "digital_wallet"
    CRYPTOCURRENCY = "cryptocurrency"
    CHECK = "check"
    CASH = "cash"
    ESCROW = "escrow"
    FINANCING = "financing"


class EscrowStatus(PyEnum):
    """Escrow status enumeration."""
    CREATED = "created"
    FUNDED = "funded"
    PENDING_DELIVERY = "pending_delivery"
    DELIVERY_CONFIRMED = "delivery_confirmed"
    DISPUTED = "disputed"
    RELEASED = "released"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class FinancingStatus(PyEnum):
    """Financing status enumeration."""
    APPLICATION = "application"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACTIVE = "active"
    COMPLETED = "completed"
    DEFAULTED = "defaulted"
    CANCELLED = "cancelled"


class FinancingType(PyEnum):
    """Financing type enumeration."""
    INVOICE_FACTORING = "invoice_factoring"
    SUPPLY_CHAIN_FINANCE = "supply_chain_finance"
    TRADE_FINANCE = "trade_finance"
    WORKING_CAPITAL = "working_capital"
    EQUIPMENT_FINANCE = "equipment_finance"
    REVOLVING_CREDIT = "revolving_credit"


class TransactionType(PyEnum):
    """Transaction type enumeration."""
    INVOICE_PAYMENT = "invoice_payment"
    ESCROW_DEPOSIT = "escrow_deposit"
    ESCROW_RELEASE = "escrow_release"
    FINANCING_DISBURSEMENT = "financing_disbursement"
    FINANCING_REPAYMENT = "financing_repayment"
    REFUND = "refund"
    FEE = "fee"
    INTEREST = "interest"
    PENALTY = "penalty"


class CurrencyCode(PyEnum):
    """Currency code enumeration."""
    PLN = "PLN"
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CNY = "CNY"


class Invoice(Base):
    """Invoice management with comprehensive billing features."""
    __tablename__ = "invoices"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    
    # Invoice Information
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=True, index=True)
    
    # Parties
    issuer_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Company issuing invoice
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Customer being billed
    
    # Status and Dates
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)
    invoice_date = Column(DateTime(timezone=True), nullable=False, index=True)
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    sent_date = Column(DateTime(timezone=True), nullable=True)
    viewed_date = Column(DateTime(timezone=True), nullable=True)
    paid_date = Column(DateTime(timezone=True), nullable=True)
    
    # Financial Information
    currency = Column(SQLEnum(CurrencyCode), default=CurrencyCode.PLN, nullable=False)
    subtotal = Column(Numeric(15, 2), nullable=False, default=0)
    tax_amount = Column(Numeric(15, 2), nullable=False, default=0)
    discount_amount = Column(Numeric(15, 2), nullable=False, default=0)
    shipping_amount = Column(Numeric(15, 2), nullable=False, default=0)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    paid_amount = Column(Numeric(15, 2), nullable=False, default=0)
    outstanding_amount = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Tax Information
    tax_rate = Column(Numeric(5, 4), nullable=False, default=0)  # e.g., 0.23 for 23% VAT
    tax_number = Column(String(50), nullable=True)  # VAT number
    reverse_charge = Column(Boolean, default=False)  # EU reverse charge mechanism
    
    # Payment Terms
    payment_terms = Column(String(100), nullable=True)  # e.g., "Net 30", "2/10 Net 30"
    payment_method_preference = Column(SQLEnum(PaymentMethod), nullable=True)
    late_fee_rate = Column(Numeric(5, 4), default=0)  # Daily late fee rate
    early_payment_discount = Column(Numeric(5, 4), default=0)  # Early payment discount
    
    # Billing Information
    billing_address = Column(JSON, nullable=False)
    # {
    #   "company": "ABC Manufacturing",
    #   "street": "123 Business St",
    #   "city": "Warsaw",
    #   "state": "Mazowieckie",
    #   "postal_code": "00-001",
    #   "country": "Poland",
    #   "tax_id": "PL1234567890"
    # }
    
    shipping_address = Column(JSON, nullable=True)
    
    # Additional Information
    notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)  # Not visible to customer
    reference_number = Column(String(100), nullable=True)  # Customer's reference
    project_code = Column(String(50), nullable=True)
    
    # Document Management
    pdf_url = Column(String(500), nullable=True)  # Generated PDF location
    document_hash = Column(String(64), nullable=True)  # For integrity verification
    digital_signature = Column(Text, nullable=True)  # Digital signature data
    
    # Automation and Workflow
    auto_send = Column(Boolean, default=False)
    auto_reminder = Column(Boolean, default=True)
    reminder_sent_count = Column(Integer, default=0)
    last_reminder_sent = Column(DateTime(timezone=True), nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    order = relationship("Order", back_populates="invoices")
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    quote = relationship("Quote", back_populates="invoices", foreign_keys=[quote_id])
    issuer = relationship("User", foreign_keys=[issuer_id], back_populates="invoices_as_issuer")
    customer = relationship("User", foreign_keys=[customer_id], back_populates="invoices_as_customer")
    # Convenience link to the Manufacturer profile tied to the issuer's user account (if any)
    issuer_manufacturer = relationship(
        "Manufacturer",
        primaryjoin="foreign(Invoice.issuer_id)==Manufacturer.user_id",
        viewonly=True,
        back_populates="invoices_as_issuer",
    )
    created_by = relationship("User", foreign_keys=[created_by_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")
    escrow_accounts = relationship("EscrowAccount", back_populates="invoice")
    
    # Indexes
    __table_args__ = (
        Index('idx_invoice_status_due_date', 'status', 'due_date'),
        Index('idx_invoice_customer_date', 'customer_id', 'invoice_date'),
        Index('idx_invoice_amount_status', 'total_amount', 'status'),
    )


class InvoiceItem(Base):
    """Invoice line items with detailed product/service information."""
    __tablename__ = "invoice_items"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    
    # Item Information
    line_number = Column(Integer, nullable=False)
    item_type = Column(String(50), nullable=False)  # product, service, shipping, discount
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    
    # Description and Details
    description = Column(Text, nullable=False)
    sku = Column(String(100), nullable=True)
    unit_of_measure = Column(String(20), nullable=True)
    
    # Quantities and Pricing
    quantity = Column(Numeric(12, 4), nullable=False, default=1)
    unit_price = Column(Numeric(12, 4), nullable=False)
    discount_percentage = Column(Numeric(5, 4), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    line_total = Column(Numeric(15, 2), nullable=False)
    
    # Tax Information
    tax_rate = Column(Numeric(5, 4), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    tax_exempt = Column(Boolean, default=False)
    tax_category = Column(String(50), nullable=True)  # standard, reduced, exempt
    
    # Additional Information
    notes = Column(Text, nullable=True)
    custom_fields = Column(JSON, nullable=True)  # Flexible additional data
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", foreign_keys=[product_id])
    material = relationship("Material", foreign_keys=[material_id])


class Payment(Base):
    """Payment processing and tracking."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Payment Information
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    escrow_account_id = Column(Integer, ForeignKey("escrow_accounts.id"), nullable=True, index=True)
    financing_agreement_id = Column(Integer, ForeignKey("financing_agreements.id"), nullable=True, index=True)
    
    # Parties
    payer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Payment Details
    payment_method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    currency = Column(SQLEnum(CurrencyCode), default=CurrencyCode.PLN, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    fee_amount = Column(Numeric(15, 2), default=0)
    net_amount = Column(Numeric(15, 2), nullable=False)  # Amount after fees
    
    # Exchange Rate Information (for multi-currency)
    exchange_rate = Column(Numeric(10, 6), default=1)
    base_currency = Column(SQLEnum(CurrencyCode), nullable=True)
    base_amount = Column(Numeric(15, 2), nullable=True)
    
    # Payment Method Details
    payment_details = Column(JSON, nullable=True)
    # {
    #   "bank_transfer": {
    #     "bank_name": "PKO Bank Polski",
    #     "account_number": "12 3456 7890 1234 5678 9012 3456",
    #     "swift_code": "PKOPPLPW",
    #     "reference": "INV-2024-001"
    #   },
    #   "credit_card": {
    #     "last_four": "1234",
    #     "brand": "Visa",
    #     "exp_month": 12,
    #     "exp_year": 2025
    #   }
    # }
    
    # Dates and Timing
    payment_date = Column(DateTime(timezone=True), nullable=False, index=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    processed_date = Column(DateTime(timezone=True), nullable=True)
    settled_date = Column(DateTime(timezone=True), nullable=True)
    
    # External References
    external_transaction_id = Column(String(100), nullable=True, index=True)
    gateway_transaction_id = Column(String(100), nullable=True)
    bank_reference = Column(String(100), nullable=True)
    
    # Additional Information
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    # Risk and Compliance
    risk_score = Column(Float, nullable=True)
    aml_check_status = Column(String(20), nullable=True)  # passed, failed, pending
    fraud_check_status = Column(String(20), nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    escrow_account = relationship("EscrowAccount", back_populates="payments")
    financing_agreement = relationship("FinancingAgreement", back_populates="payments")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_status_date', 'status', 'payment_date'),
        Index('idx_payment_method_amount', 'payment_method', 'amount'),
        Index('idx_payment_external_id', 'external_transaction_id'),
    )


class EscrowAccount(Base):
    """Escrow service for secure transactions."""
    __tablename__ = "escrow_accounts"

    id = Column(Integer, primary_key=True, index=True)
    
    # Escrow Information
    escrow_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)
    
    # Parties
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    escrow_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Third-party agent
    
    # Escrow Details
    status = Column(SQLEnum(EscrowStatus), default=EscrowStatus.CREATED, index=True)
    currency = Column(SQLEnum(CurrencyCode), default=CurrencyCode.PLN, nullable=False)
    escrow_amount = Column(Numeric(15, 2), nullable=False)
    fee_amount = Column(Numeric(15, 2), default=0)
    fee_percentage = Column(Numeric(5, 4), default=0)
    
    # Terms and Conditions
    terms_and_conditions = Column(Text, nullable=False)
    delivery_requirements = Column(JSON, nullable=True)
    # {
    #   "delivery_method": "shipping",
    #   "tracking_required": true,
    #   "inspection_period_days": 7,
    #   "acceptance_criteria": "As per purchase order specifications"
    # }
    
    # Timeline
    funding_deadline = Column(DateTime(timezone=True), nullable=True)
    delivery_deadline = Column(DateTime(timezone=True), nullable=True)
    inspection_period_days = Column(Integer, default=7)
    auto_release_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status Tracking
    funded_date = Column(DateTime(timezone=True), nullable=True)
    delivery_confirmed_date = Column(DateTime(timezone=True), nullable=True)
    released_date = Column(DateTime(timezone=True), nullable=True)
    dispute_raised_date = Column(DateTime(timezone=True), nullable=True)
    
    # Dispute Information
    dispute_reason = Column(Text, nullable=True)
    dispute_resolution = Column(Text, nullable=True)
    arbitrator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Documentation
    contract_documents = Column(JSON, nullable=True)  # URLs to contract documents
    delivery_proof = Column(JSON, nullable=True)  # Delivery confirmation documents
    inspection_reports = Column(JSON, nullable=True)  # Quality inspection reports
    
    # Additional Information
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    invoice = relationship("Invoice", back_populates="escrow_accounts")
    order = relationship("Order", back_populates="escrow_accounts")
    buyer = relationship("User", foreign_keys=[buyer_id])
    seller = relationship("User", foreign_keys=[seller_id])
    escrow_agent = relationship("User", foreign_keys=[escrow_agent_id])
    arbitrator = relationship("User", foreign_keys=[arbitrator_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    payments = relationship("Payment", back_populates="escrow_account")
    milestones = relationship("app.models.financial.FinancialEscrowMilestone", back_populates="escrow_account")
    
    # Indexes
    __table_args__ = (
        Index('idx_escrow_status_date', 'status', 'funded_date'),
        Index('idx_escrow_buyer_seller', 'buyer_id', 'seller_id'),
        Index('idx_escrow_amount_currency', 'escrow_amount', 'currency'),
    )


class FinancialEscrowMilestone(Base):
    """Milestone-based escrow releases."""
    __tablename__ = "escrow_milestones"

    id = Column(Integer, primary_key=True, index=True)
    escrow_account_id = Column(Integer, ForeignKey("escrow_accounts.id"), nullable=False, index=True)
    
    # Milestone Information
    milestone_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Financial Details
    amount = Column(Numeric(15, 2), nullable=False)
    percentage = Column(Numeric(5, 4), nullable=False)  # Percentage of total escrow
    
    # Status and Dates
    status = Column(String(20), default="pending", index=True)  # pending, completed, released
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    released_date = Column(DateTime(timezone=True), nullable=True)
    
    # Requirements
    completion_criteria = Column(Text, nullable=False)
    required_documents = Column(JSON, nullable=True)
    approval_required = Column(Boolean, default=True)
    
    # Verification
    evidence_documents = Column(JSON, nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    escrow_account = relationship("EscrowAccount", back_populates="milestones")
    verified_by = relationship("User", foreign_keys=[verified_by_id])


class FinancingAgreement(Base):
    """Financing agreements and trade finance."""
    __tablename__ = "financing_agreements"

    id = Column(Integer, primary_key=True, index=True)
    
    # Agreement Information
    agreement_number = Column(String(50), unique=True, nullable=False, index=True)
    financing_type = Column(SQLEnum(FinancingType), nullable=False, index=True)
    status = Column(SQLEnum(FinancingStatus), default=FinancingStatus.APPLICATION, index=True)
    
    # Parties
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lender_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Financial institution
    guarantor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Financial Terms
    currency = Column(SQLEnum(CurrencyCode), default=CurrencyCode.PLN, nullable=False)
    principal_amount = Column(Numeric(15, 2), nullable=False)
    interest_rate = Column(Numeric(5, 4), nullable=False)  # Annual interest rate
    fee_percentage = Column(Numeric(5, 4), default=0)  # Origination fee
    
    # Loan Terms
    term_months = Column(Integer, nullable=False)  # Loan term in months
    payment_frequency = Column(String(20), default="monthly")  # monthly, quarterly, etc.
    grace_period_days = Column(Integer, default=0)
    
    # Collateral and Security
    collateral_type = Column(String(50), nullable=True)  # inventory, receivables, equipment
    collateral_value = Column(Numeric(15, 2), nullable=True)
    security_details = Column(JSON, nullable=True)
    
    # Dates
    application_date = Column(DateTime(timezone=True), nullable=False, index=True)
    approval_date = Column(DateTime(timezone=True), nullable=True)
    disbursement_date = Column(DateTime(timezone=True), nullable=True)
    maturity_date = Column(DateTime(timezone=True), nullable=False)
    
    # Current Status
    outstanding_balance = Column(Numeric(15, 2), default=0)
    total_paid = Column(Numeric(15, 2), default=0)
    next_payment_date = Column(DateTime(timezone=True), nullable=True)
    next_payment_amount = Column(Numeric(15, 2), nullable=True)
    
    # Risk Assessment
    credit_score = Column(Integer, nullable=True)
    risk_rating = Column(String(10), nullable=True)  # AAA, AA, A, BBB, etc.
    debt_to_income_ratio = Column(Numeric(5, 4), nullable=True)
    
    # Documentation
    loan_documents = Column(JSON, nullable=True)  # URLs to loan documents
    financial_statements = Column(JSON, nullable=True)
    credit_reports = Column(JSON, nullable=True)
    
    # Covenants and Conditions
    financial_covenants = Column(JSON, nullable=True)
    # {
    #   "minimum_current_ratio": 1.5,
    #   "maximum_debt_to_equity": 2.0,
    #   "minimum_cash_flow": 100000
    # }
    
    operational_covenants = Column(JSON, nullable=True)
    covenant_compliance_status = Column(String(20), default="compliant")
    
    # Additional Information
    purpose = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    borrower = relationship("User", foreign_keys=[borrower_id])
    lender = relationship("User", foreign_keys=[lender_id])
    guarantor = relationship("User", foreign_keys=[guarantor_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    payments = relationship("Payment", back_populates="financing_agreement")
    repayment_schedule = relationship("FinancingRepayment", back_populates="financing_agreement")
    
    # Indexes
    __table_args__ = (
        Index('idx_financing_status_type', 'status', 'financing_type'),
        Index('idx_financing_borrower_date', 'borrower_id', 'application_date'),
        Index('idx_financing_amount_rate', 'principal_amount', 'interest_rate'),
    )


class FinancingRepayment(Base):
    """Financing repayment schedule and tracking."""
    __tablename__ = "financing_repayments"

    id = Column(Integer, primary_key=True, index=True)
    financing_agreement_id = Column(Integer, ForeignKey("financing_agreements.id"), nullable=False, index=True)
    
    # Payment Information
    payment_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    due_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Payment Breakdown
    total_payment = Column(Numeric(15, 2), nullable=False)
    principal_payment = Column(Numeric(15, 2), nullable=False)
    interest_payment = Column(Numeric(15, 2), nullable=False)
    fee_payment = Column(Numeric(15, 2), default=0)
    
    # Balance Information
    beginning_balance = Column(Numeric(15, 2), nullable=False)
    ending_balance = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(String(20), default="scheduled", index=True)  # scheduled, paid, overdue, partial
    paid_date = Column(DateTime(timezone=True), nullable=True)
    paid_amount = Column(Numeric(15, 2), default=0)
    
    # Late Payment Information
    days_overdue = Column(Integer, default=0)
    late_fee = Column(Numeric(15, 2), default=0)
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    financing_agreement = relationship("FinancingAgreement", back_populates="repayment_schedule")


class FinancialTransaction(Base):
    """General financial transaction ledger."""
    __tablename__ = "financial_transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Transaction Information
    transaction_number = Column(String(50), unique=True, nullable=False, index=True)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False, index=True)
    transaction_date = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Related Records
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True, index=True)
    escrow_account_id = Column(Integer, ForeignKey("escrow_accounts.id"), nullable=True, index=True)
    financing_agreement_id = Column(Integer, ForeignKey("financing_agreements.id"), nullable=True, index=True)
    
    # Parties
    from_account_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Financial Details
    currency = Column(SQLEnum(CurrencyCode), default=CurrencyCode.PLN, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    fee_amount = Column(Numeric(15, 2), default=0)
    net_amount = Column(Numeric(15, 2), nullable=False)
    
    # Accounting
    debit_account = Column(String(50), nullable=True)  # Chart of accounts
    credit_account = Column(String(50), nullable=True)
    
    # Additional Information
    description = Column(Text, nullable=False)
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Status and Reconciliation
    status = Column(String(20), default="pending", index=True)
    reconciled = Column(Boolean, default=False, index=True)
    reconciled_date = Column(DateTime(timezone=True), nullable=True)
    
    # Audit Fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    payment = relationship("Payment", foreign_keys=[payment_id])
    escrow_account = relationship("EscrowAccount", foreign_keys=[escrow_account_id])
    financing_agreement = relationship("FinancingAgreement", foreign_keys=[financing_agreement_id])
    from_account = relationship("User", foreign_keys=[from_account_id])
    to_account = relationship("User", foreign_keys=[to_account_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_transaction_type_date', 'transaction_type', 'transaction_date'),
        Index('idx_transaction_amount_currency', 'amount', 'currency'),
        Index('idx_transaction_accounts', 'from_account_id', 'to_account_id'),
    )


class CreditAssessment(Base):
    """Credit assessment and scoring for financing."""
    __tablename__ = "credit_assessments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Assessment Information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assessment_date = Column(DateTime(timezone=True), nullable=False, index=True)
    assessment_type = Column(String(50), nullable=False)  # initial, periodic, event_driven
    
    # Credit Score and Rating
    credit_score = Column(Integer, nullable=True)  # 300-850 scale
    credit_rating = Column(String(10), nullable=True)  # AAA, AA, A, BBB, etc.
    risk_category = Column(String(20), nullable=True)  # low, medium, high
    
    # Financial Metrics
    annual_revenue = Column(Numeric(15, 2), nullable=True)
    net_income = Column(Numeric(15, 2), nullable=True)
    total_assets = Column(Numeric(15, 2), nullable=True)
    total_liabilities = Column(Numeric(15, 2), nullable=True)
    working_capital = Column(Numeric(15, 2), nullable=True)
    
    # Financial Ratios
    current_ratio = Column(Numeric(5, 4), nullable=True)
    quick_ratio = Column(Numeric(5, 4), nullable=True)
    debt_to_equity_ratio = Column(Numeric(5, 4), nullable=True)
    debt_to_income_ratio = Column(Numeric(5, 4), nullable=True)
    interest_coverage_ratio = Column(Numeric(5, 4), nullable=True)
    
    # Payment History
    payment_history_score = Column(Integer, nullable=True)  # 0-100
    days_sales_outstanding = Column(Integer, nullable=True)
    late_payment_incidents = Column(Integer, default=0)
    
    # Business Information
    years_in_business = Column(Integer, nullable=True)
    industry_risk_score = Column(Integer, nullable=True)
    business_size_category = Column(String(20), nullable=True)  # micro, small, medium, large
    
    # Credit Limits and Recommendations
    recommended_credit_limit = Column(Numeric(15, 2), nullable=True)
    maximum_exposure = Column(Numeric(15, 2), nullable=True)
    payment_terms_recommendation = Column(String(50), nullable=True)
    
    # Assessment Details
    assessment_methodology = Column(String(100), nullable=True)
    data_sources = Column(JSON, nullable=True)
    assessment_notes = Column(Text, nullable=True)
    
    # Validity
    valid_until = Column(DateTime(timezone=True), nullable=True)
    next_review_date = Column(DateTime(timezone=True), nullable=True)
    
    # Audit Fields
    assessed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    assessed_by = relationship("User", foreign_keys=[assessed_by_id])
    
    # Indexes
    __table_args__ = (
        Index('idx_credit_user_date', 'user_id', 'assessment_date'),
        Index('idx_credit_score_rating', 'credit_score', 'credit_rating'),
        Index('idx_credit_validity', 'valid_until'),
    )


class TaxConfiguration(Base):
    """Tax configuration for different jurisdictions."""
    __tablename__ = "tax_configurations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Jurisdiction Information
    country_code = Column(String(2), nullable=False, index=True)  # ISO 3166-1 alpha-2
    region_code = Column(String(10), nullable=True)  # State/province code
    tax_authority = Column(String(100), nullable=False)
    
    # Tax Details
    tax_name = Column(String(100), nullable=False)  # VAT, GST, Sales Tax, etc.
    tax_type = Column(String(50), nullable=False)  # value_added, sales, excise, etc.
    tax_rate = Column(Numeric(5, 4), nullable=False)
    
    # Applicability
    product_categories = Column(JSON, nullable=True)  # Applicable product categories
    service_categories = Column(JSON, nullable=True)  # Applicable service categories
    exemptions = Column(JSON, nullable=True)  # Tax exemption rules
    
    # Effective Dates
    effective_from = Column(DateTime(timezone=True), nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    
    # Configuration
    reverse_charge_applicable = Column(Boolean, default=False)
    digital_services_tax = Column(Boolean, default=False)
    threshold_amount = Column(Numeric(15, 2), nullable=True)  # Tax threshold
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP'))
    
    # Indexes
    __table_args__ = (
        Index('idx_tax_country_region', 'country_code', 'region_code'),
        Index('idx_tax_effective_dates', 'effective_from', 'effective_to'),
        Index('idx_tax_rate_type', 'tax_rate', 'tax_type'),
    )


class ExchangeRate(Base):
    """Currency exchange rates for multi-currency support."""
    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    
    # Currency Pair
    from_currency = Column(SQLEnum(CurrencyCode), nullable=False, index=True)
    to_currency = Column(SQLEnum(CurrencyCode), nullable=False, index=True)
    
    # Rate Information
    rate = Column(Numeric(10, 6), nullable=False)
    rate_date = Column(DateTime(timezone=True), nullable=False, index=True)
    rate_source = Column(String(100), nullable=True)  # ECB, Fed, etc.
    
    # Rate Type
    rate_type = Column(String(20), default="spot")  # spot, forward, average
    
    # Audit Fields
    created_at = Column(DateTime(timezone=True), server_default=text('CURRENT_TIMESTAMP'))
    
    # Indexes
    __table_args__ = (
        Index('idx_exchange_currencies_date', 'from_currency', 'to_currency', 'rate_date'),
        Index('idx_exchange_rate_source', 'rate_source', 'rate_date'),
        UniqueConstraint('from_currency', 'to_currency', 'rate_date', 'rate_type', 
                        name='uq_exchange_rate_unique'),
    ) 