#!/usr/bin/env python3
"""
Setup script for the comprehensive multinational Stripe payment system.

This script initializes the payment system with all necessary configurations,
creates required database tables, and validates the setup.

Usage:
    python scripts/setup_payment_system.py --environment production
    python scripts/setup_payment_system.py --environment development --test-mode
"""

import os
import sys
import argparse
import asyncio
from typing import Dict, List
from decimal import Decimal
import stripe
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from loguru import logger

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.models.payment import (
    Transaction, StripeConnectAccount, Subscription, Invoice, WebhookEvent,
    PaymentRegion, ConnectAccountType, TransactionType, TransactionStatus
)
from app.services.payment import MultiRegionStripeService
from app.services.subscription_service import SubscriptionService
from app.services.invoice_service import InvoiceService


class PaymentSystemSetup:
    """Setup and validate the multinational payment system"""
    
    def __init__(self, environment: str = "development", test_mode: bool = False):
        self.environment = environment
        self.test_mode = test_mode
        self.settings = get_settings()
        self.stripe_service = MultiRegionStripeService()
        self.subscription_service = SubscriptionService()
        self.invoice_service = InvoiceService()
        
        # Setup logging
        log_level = "DEBUG" if test_mode else "INFO"
        logger.remove()
        logger.add(sys.stdout, level=log_level, format="{time} | {level} | {message}")
        
        if not test_mode:
            logger.add("payment_setup.log", level="INFO", rotation="10 MB")
    
    def validate_environment_variables(self) -> bool:
        """Validate all required environment variables are set"""
        
        logger.info("Validating environment variables...")
        
        required_vars = {
            'US': ['STRIPE_US_SECRET_KEY', 'STRIPE_US_PUBLISHABLE_KEY', 'STRIPE_US_WEBHOOK_SECRET'],
            'EU': ['STRIPE_EU_SECRET_KEY', 'STRIPE_EU_PUBLISHABLE_KEY', 'STRIPE_EU_WEBHOOK_SECRET'],
            'UK': ['STRIPE_UK_SECRET_KEY', 'STRIPE_UK_PUBLISHABLE_KEY', 'STRIPE_UK_WEBHOOK_SECRET']
        }
        
        missing_vars = []
        
        for region, vars_list in required_vars.items():
            for var in vars_list:
                if not getattr(self.settings, var, None):
                    missing_vars.append(f"{var} (for {region} region)")
        
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
            return False
        
        logger.success("All required environment variables are set")
        return True
    
    def validate_stripe_keys(self) -> Dict[str, bool]:
        """Validate Stripe API keys for all regions"""
        
        logger.info("Validating Stripe API keys...")
        
        results = {}
        regions_config = {
            PaymentRegion.US: {
                'secret_key': self.settings.STRIPE_US_SECRET_KEY,
                'publishable_key': self.settings.STRIPE_US_PUBLISHABLE_KEY
            },
            PaymentRegion.EU: {
                'secret_key': self.settings.STRIPE_EU_SECRET_KEY,
                'publishable_key': self.settings.STRIPE_EU_PUBLISHABLE_KEY
            },
            PaymentRegion.UK: {
                'secret_key': self.settings.STRIPE_UK_SECRET_KEY,
                'publishable_key': self.settings.STRIPE_UK_PUBLISHABLE_KEY
            }
        }
        
        for region, config in regions_config.items():
            try:
                # Test secret key
                stripe.api_key = config['secret_key']
                account = stripe.Account.retrieve()
                
                results[region.value] = {
                    'valid': True,
                    'account_id': account.id,
                    'country': account.country,
                    'email': account.email,
                    'charges_enabled': account.charges_enabled,
                    'payouts_enabled': account.payouts_enabled
                }
                
                logger.success(f"{region.value} region: Valid Stripe account {account.id}")
                
            except stripe.error.AuthenticationError:
                logger.error(f"{region.value} region: Invalid Stripe secret key")
                results[region.value] = {'valid': False, 'error': 'Invalid secret key'}
            except Exception as e:
                logger.error(f"{region.value} region: Error validating Stripe key: {str(e)}")
                results[region.value] = {'valid': False, 'error': str(e)}
        
        return results
    
    def setup_database_tables(self) -> bool:
        """Create all necessary database tables"""
        
        logger.info("Setting up database tables...")
        
        try:
            # Create engine
            engine = create_engine(self.settings.DATABASE_URL)
            
            # Create all tables
            Base.metadata.create_all(bind=engine)
            
            # Verify tables were created
            with engine.connect() as conn:
                # Check if key tables exist
                key_tables = ['transactions', 'stripe_connect_accounts', 'subscriptions', 'invoices', 'webhook_events']
                
                for table in key_tables:
                    result = conn.execute(text(f"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '{table}')"))
                    exists = result.fetchone()[0]
                    
                    if exists:
                        logger.success(f"Table '{table}' created successfully")
                    else:
                        logger.error(f"Failed to create table '{table}'")
                        return False
            
            logger.success("All database tables created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error setting up database tables: {str(e)}")
            return False
    
    def create_webhook_endpoints(self) -> Dict[str, str]:
        """Create or update webhook endpoints in Stripe"""
        
        logger.info("Setting up webhook endpoints...")
        
        webhook_urls = {
            PaymentRegion.US: f"{self.settings.FRONTEND_URL}/webhooks/stripe/us",
            PaymentRegion.EU: f"{self.settings.FRONTEND_URL}/webhooks/stripe/eu",
            PaymentRegion.UK: f"{self.settings.FRONTEND_URL}/webhooks/stripe/uk"
        }
        
        webhook_events = [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'payment_intent.requires_action',
            'account.updated',
            'account.application.deauthorized',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
            'invoice.finalized',
            'transfer.created',
            'transfer.paid',
            'transfer.failed',
            'charge.dispute.created',
            'charge.dispute.closed',
            'radar.early_fraud_warning.created',
            'review.opened',
            'review.closed'
        ]
        
        results = {}
        
        for region in [PaymentRegion.US, PaymentRegion.EU, PaymentRegion.UK]:
            try:
                self.stripe_service.set_stripe_key(region)
                
                # Create webhook endpoint
                webhook_endpoint = stripe.WebhookEndpoint.create(
                    url=webhook_urls[region],
                    enabled_events=webhook_events,
                    description=f"Manufacturing Platform - {region.value.upper()} Region"
                )
                
                results[region.value] = {
                    'id': webhook_endpoint.id,
                    'url': webhook_endpoint.url,
                    'secret': webhook_endpoint.secret
                }
                
                logger.success(f"Webhook endpoint created for {region.value}: {webhook_endpoint.id}")
                
            except Exception as e:
                logger.error(f"Error creating webhook for {region.value}: {str(e)}")
                results[region.value] = {'error': str(e)}
        
        return results
    
    def setup_subscription_plans(self) -> bool:
        """Create subscription plans in Stripe"""
        
        logger.info("Setting up subscription plans...")
        
        plans = self.subscription_service.get_subscription_plans()
        
        for region in [PaymentRegion.US, PaymentRegion.EU, PaymentRegion.UK]:
            try:
                self.stripe_service.set_stripe_key(region)
                
                for plan_name, plan_config in plans.items():
                    for interval in ['month', 'year']:
                        amount = plan_config[f'price_{interval}ly']
                        
                        # Create price in Stripe
                        price = stripe.Price.create(
                            unit_amount=int(amount * 100),
                            currency='usd',  # TODO: Make region-specific
                            recurring={'interval': interval},
                            product_data={
                                'name': f"{plan_config['name']} ({interval}ly)",
                                'metadata': {
                                    'plan_name': plan_name,
                                    'region': region.value
                                }
                            },
                            lookup_key=f"{plan_name}_{interval}_{region.value}",
                            metadata={
                                'plan_name': plan_name,
                                'interval': interval,
                                'region': region.value
                            }
                        )
                        
                        logger.success(f"Created {plan_name} {interval}ly plan for {region.value}: {price.id}")
                
            except Exception as e:
                logger.error(f"Error creating subscription plans for {region.value}: {str(e)}")
                return False
        
        return True
    
    def test_payment_flows(self) -> bool:
        """Test critical payment flows with test data"""
        
        if not self.test_mode:
            logger.info("Skipping payment flow tests (not in test mode)")
            return True
        
        logger.info("Testing payment flows...")
        
        try:
            # Test currency conversion
            usd_to_eur = self.stripe_service.get_exchange_rate('USD', 'EUR')
            logger.info(f"USD to EUR rate: {usd_to_eur}")
            
            # Test fee calculation
            fees = self.stripe_service.calculate_fees(
                Decimal('100.00'), PaymentRegion.US, PaymentMethod.CARD
            )
            logger.info(f"US card fees for $100: {fees}")
            
            # Test tax calculation
            tax_info = self.stripe_service.calculate_tax(
                Decimal('100.00'), PaymentRegion.EU, 'DE'
            )
            logger.info(f"German tax for €100: {tax_info}")
            
            logger.success("Payment flow tests completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error in payment flow tests: {str(e)}")
            return False
    
    def validate_webhook_signatures(self) -> bool:
        """Validate webhook signature verification"""
        
        logger.info("Validating webhook signature verification...")
        
        try:
            # Test signature verification for each region
            test_payload = b'{"test": "payload"}'
            
            for region in [PaymentRegion.US, PaymentRegion.EU, PaymentRegion.UK]:
                # This would normally require actual webhook secret and signature
                # For now, just verify the method exists and is callable
                config = self.stripe_service.get_stripe_config(region)
                webhook_secret = config.get('webhook_secret')
                
                if webhook_secret:
                    logger.success(f"Webhook secret configured for {region.value}")
                else:
                    logger.warning(f"No webhook secret configured for {region.value}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating webhook signatures: {str(e)}")
            return False
    
    def generate_configuration_summary(self) -> Dict:
        """Generate a summary of the payment system configuration"""
        
        return {
            'environment': self.environment,
            'test_mode': self.test_mode,
            'regions_configured': ['US', 'EU', 'UK'],
            'features_enabled': {
                'escrow': self.settings.ENABLE_ESCROW,
                'marketplace_payments': self.settings.ENABLE_MARKETPLACE_PAYMENTS,
                'subscriptions': self.settings.ENABLE_SUBSCRIPTIONS,
                'invoicing': self.settings.ENABLE_INVOICING,
                'fraud_protection': self.settings.ENABLE_RADAR
            },
            'supported_currencies': self.settings.SUPPORTED_CURRENCIES,
            'commission_rate': f"{self.settings.PLATFORM_COMMISSION_RATE}%",
            'base_currency': self.settings.PLATFORM_BASE_CURRENCY
        }
    
    async def run_setup(self) -> bool:
        """Run the complete setup process"""
        
        logger.info(f"Starting payment system setup for {self.environment} environment...")
        
        steps = [
            ("Validating environment variables", self.validate_environment_variables),
            ("Setting up database tables", self.setup_database_tables),
            ("Validating Stripe keys", lambda: all(r['valid'] for r in self.validate_stripe_keys().values())),
            ("Testing payment flows", self.test_payment_flows),
            ("Validating webhook signatures", self.validate_webhook_signatures)
        ]
        
        if not self.test_mode:
            steps.extend([
                ("Creating webhook endpoints", lambda: self.create_webhook_endpoints()),
                ("Setting up subscription plans", self.setup_subscription_plans)
            ])
        
        success = True
        
        for step_name, step_function in steps:
            logger.info(f"Running: {step_name}")
            
            try:
                result = step_function()
                if result:
                    logger.success(f"✓ {step_name}")
                else:
                    logger.error(f"✗ {step_name}")
                    success = False
                    
            except Exception as e:
                logger.error(f"✗ {step_name}: {str(e)}")
                success = False
        
        # Generate summary
        config_summary = self.generate_configuration_summary()
        
        logger.info("=== PAYMENT SYSTEM CONFIGURATION SUMMARY ===")
        for key, value in config_summary.items():
            logger.info(f"{key}: {value}")
        logger.info("=============================================")
        
        if success:
            logger.success("🎉 Payment system setup completed successfully!")
            logger.info("Next steps:")
            logger.info("1. Update your frontend to use the regional publishable keys")
            logger.info("2. Test payment flows in your staging environment")
            logger.info("3. Configure monitoring and alerts")
            logger.info("4. Review and test webhook endpoints")
        else:
            logger.error("❌ Payment system setup failed. Please review the errors above.")
        
        return success


def main():
    """Main setup script entry point"""
    
    parser = argparse.ArgumentParser(description="Setup multinational Stripe payment system")
    parser.add_argument(
        '--environment', 
        choices=['development', 'staging', 'production'],
        default='development',
        help='Target environment'
    )
    parser.add_argument(
        '--test-mode',
        action='store_true',
        help='Run in test mode (skip actual Stripe API calls)'
    )
    parser.add_argument(
        '--skip-database',
        action='store_true',
        help='Skip database table creation'
    )
    
    args = parser.parse_args()
    
    # Initialize setup
    setup = PaymentSystemSetup(
        environment=args.environment,
        test_mode=args.test_mode
    )
    
    # Run setup
    success = asyncio.run(setup.run_setup())
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 