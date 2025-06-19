"""
Database models for the manufacturing platform
"""
# Core models
from .user import User, UserRole, RegistrationStatus
from .producer import Manufacturer, Producer
from .order import Order, OrderStatus, Priority
from .quote import Quote, QuoteStatus, QuoteType, ProductionQuote, ProductionQuoteInquiry, ProductionQuoteType
from .quote_template import QuoteTemplate
from .payment import Transaction, TransactionStatus, TransactionType
from .product import Product

# Financial models
from .financial import (
    Invoice, InvoiceItem, InvoiceStatus, Payment, PaymentStatus, PaymentMethod,
    EscrowAccount, FinancialEscrowMilestone, EscrowStatus, FinancingAgreement
)

# Supply chain models  
from .supply_chain import (
    PurchaseOrder, Material, Vendor, InventoryItem, InventoryLocation
)

# Payment escrow models - TEMPORARILY DISABLED
# from .payment_escrow import (
#     EscrowTransaction, PaymentEscrowMilestone, PlatformFee, PaymentBypassDetection
# )

# Communication models - TEMPORARILY DISABLED
# from .communication import CommunicationBlock, MessageMonitoring, PaymentReminder

# Communication models
from .message import Message, MessageRead, Room, RoomParticipant

# Security models
from .security_models import SecurityEvent, LoginAttempt, APIKey

# Subscription models
from .subscription import ClientSubscription, SubscriptionPayment

# Production quote models
from .production_quote import LegacyProductionQuote, LegacyProductionQuoteInquiry

__all__ = [
    # Core models
    "User", "UserRole", "RegistrationStatus",
    "Manufacturer", "Producer",
    "Order", "OrderStatus", "Priority", 
    "Quote", "QuoteStatus", "QuoteType", "ProductionQuote", "ProductionQuoteInquiry", "ProductionQuoteType",
    "QuoteTemplate",
    "Transaction", "TransactionStatus", "TransactionType",
    "Product",
    
    # Financial models
    "Invoice", "InvoiceItem", "InvoiceStatus", 
    "Payment", "PaymentStatus", "PaymentMethod",
    "EscrowAccount", "FinancialEscrowMilestone", "EscrowStatus", 
    "FinancingAgreement",
    
    # Supply chain models
    "PurchaseOrder", "Material", "Vendor", "InventoryItem", "InventoryLocation",
    
    # Payment escrow models - TEMPORARILY DISABLED
    # "EscrowTransaction", "PaymentEscrowMilestone", "PlatformFee", "PaymentBypassDetection",
    
    # Communication models
    "Message", "MessageRead", "Room", "RoomParticipant",
    # "CommunicationBlock", "MessageMonitoring", "PaymentReminder",
    
    # Security models
    "SecurityEvent", "LoginAttempt", "APIKey",
    
    # Subscription models
    "ClientSubscription", "SubscriptionPayment",
    
    # Production quote models
    "LegacyProductionQuote", "LegacyProductionQuoteInquiry",
] 