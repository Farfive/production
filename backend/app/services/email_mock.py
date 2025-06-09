"""
Mock Email Service for Testing
Provides the same interface as the real email service but logs instead of sending emails
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


async def send_verification_email(email: str, first_name: str, verification_token: str = None) -> Optional[str]:
    """Mock verification email sending"""
    logger.info(f"[MOCK EMAIL] Verification email to {email} for {first_name}")
    logger.info(f"[MOCK EMAIL] Verification token: {verification_token}")
    return "mock_email_id_verification"


async def send_password_reset_email(email: str, first_name: str, reset_token: str) -> Optional[str]:
    """Mock password reset email sending"""
    logger.info(f"[MOCK EMAIL] Password reset email to {email} for {first_name}")
    logger.info(f"[MOCK EMAIL] Reset token: {reset_token}")
    return "mock_email_id_password_reset"


async def send_welcome_email(email: str, first_name: str, language: str = 'en') -> Optional[str]:
    """Mock welcome email sending"""
    logger.info(f"[MOCK EMAIL] Welcome email to {email} for {first_name} (language: {language})")
    return "mock_email_id_welcome"


async def send_order_confirmation_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock order confirmation email"""
    logger.info(f"[MOCK EMAIL] Order confirmation to {client_email} for {client_name}")
    logger.info(f"[MOCK EMAIL] Order data: {order_data}")
    return "mock_email_id_order_confirmation"


async def send_order_received_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_deadline: str = None,
    language: str = 'en'
) -> Optional[str]:
    """Mock order received email"""
    logger.info(f"[MOCK EMAIL] Order received notification to {manufacturer_email} for {manufacturer_name}")
    logger.info(f"[MOCK EMAIL] Quote deadline: {quote_deadline}")
    return "mock_email_id_order_received"


async def send_quote_submitted_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock quote submitted email"""
    logger.info(f"[MOCK EMAIL] Quote submitted confirmation to {manufacturer_email}")
    return "mock_email_id_quote_submitted"


async def send_quote_received_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock quote received email"""
    logger.info(f"[MOCK EMAIL] Quote received notification to {client_email}")
    return "mock_email_id_quote_received"


async def send_order_accepted_email(
    manufacturer_email: str,
    manufacturer_name: str,
    order_data: Dict[str, Any],
    quote_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock order accepted email"""
    logger.info(f"[MOCK EMAIL] Order accepted notification to {manufacturer_email}")
    return "mock_email_id_order_accepted"


async def send_production_started_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    estimated_completion: str = None,
    language: str = 'en'
) -> Optional[str]:
    """Mock production started email"""
    logger.info(f"[MOCK EMAIL] Production started notification to {client_email}")
    return "mock_email_id_production_started"


async def send_production_milestone_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    milestone_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock production milestone email"""
    logger.info(f"[MOCK EMAIL] Production milestone notification to {client_email}")
    return "mock_email_id_production_milestone"


async def send_delivery_shipped_email(
    client_email: str,
    client_name: str,
    order_data: Dict[str, Any],
    shipping_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock delivery shipped email"""
    logger.info(f"[MOCK EMAIL] Delivery shipped notification to {client_email}")
    return "mock_email_id_delivery_shipped"


async def send_payment_confirmation_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    payment_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock payment confirmation email"""
    logger.info(f"[MOCK EMAIL] Payment confirmation to {email}")
    return "mock_email_id_payment_confirmation"


async def send_deadline_reminder_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    days_remaining: int,
    language: str = 'en'
) -> Optional[str]:
    """Mock deadline reminder email"""
    logger.info(f"[MOCK EMAIL] Deadline reminder to {email} - {days_remaining} days remaining")
    return "mock_email_id_deadline_reminder"


async def send_review_request_email(
    email: str,
    name: str,
    order_data: Dict[str, Any],
    manufacturer_data: Dict[str, Any],
    language: str = 'en'
) -> Optional[str]:
    """Mock review request email"""
    logger.info(f"[MOCK EMAIL] Review request to {email}")
    return "mock_email_id_review_request"


def get_email_status(email_id: str) -> Optional[Dict]:
    """Mock email status check"""
    logger.info(f"[MOCK EMAIL] Checking status for email ID: {email_id}")
    return {
        "email_id": email_id,
        "status": "delivered",
        "timestamp": "2024-01-01T00:00:00Z"
    }


def unsubscribe_email(email: str, email_type: str = None, reason: str = None):
    """Mock email unsubscribe"""
    logger.info(f"[MOCK EMAIL] Unsubscribing {email} from {email_type or 'all'} emails")


def resubscribe_email(email: str, email_type: str = None):
    """Mock email resubscribe"""
    logger.info(f"[MOCK EMAIL] Resubscribing {email} to {email_type or 'all'} emails")


def is_email_unsubscribed(email: str, email_type: str = None) -> bool:
    """Mock email unsubscribe check"""
    logger.info(f"[MOCK EMAIL] Checking unsubscribe status for {email}")
    return False  # Always return False for testing 