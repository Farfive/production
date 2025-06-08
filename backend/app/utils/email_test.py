import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path
from loguru import logger

from app.services.email import EmailType, email_service
from app.services.email_templates import template_manager


class EmailTestUtils:
    """Utilities for testing email templates and functionality"""
    
    def __init__(self):
        self.test_data = self._generate_test_data()
    
    def _generate_test_data(self) -> Dict[str, Any]:
        """Generate test data for email types"""
        return {
            EmailType.VERIFICATION: {
                'first_name': 'Jan',
                'verification_link': 'https://manufacturingplatform.com/verify?token=test123',
                'verification_token': 'test123'
            },
            EmailType.ORDER_CONFIRMATION: {
                'client_name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych',
                    'quantity': 1000,
                    'material': 'Stal nierdzewna 316L',
                    'budget_max_pln': 25000.00,
                    'delivery_deadline': '2024-03-15'
                },
                'order_link': 'https://manufacturingplatform.com/orders/12345',
                'estimated_matching_time': '24-48 godzin'
            },
            EmailType.QUOTE_RECEIVED: {
                'client_name': 'Marek Kowalski',
                'order': {'id': 12345, 'title': 'Produkcja elementów'},
                'quote': {'id': 67890, 'price': 22500.00, 'lead_time_days': 14},
                'manufacturer': {'business_name': 'Zakład Metalowy Nowak'},
                'review_link': 'https://manufacturingplatform.com/quotes/67890',
                'response_deadline': '7 dni'
            }
        }
    
    async def test_template_rendering(self, email_type: EmailType, language: str = 'en') -> Dict[str, str]:
        """Test template rendering for a specific email type"""
        try:
            context = self.test_data.get(email_type, {'test': True})
            
            rendered = template_manager.render_template(
                email_type.value, 
                context, 
                language
            )
            
            logger.info(f"Successfully rendered {email_type.value} template in {language}")
            return rendered
            
        except Exception as e:
            logger.error(f"Failed to render {email_type.value} template: {str(e)}")
            raise
    
    async def send_test_email(self, email_type: EmailType, to_email: str, language: str = 'en') -> Optional[str]:
        """Send test email to specified address"""
        try:
            context = self.test_data.get(email_type, {'test': True})
            
            email_id = await email_service.send_email(
                email_type=email_type,
                to_email=to_email,
                to_name='Test User',
                context=context,
                language=language
            )
            
            if email_id:
                logger.info(f"Test email {email_type.value} sent to {to_email} with ID: {email_id}")
            
            return email_id
            
        except Exception as e:
            logger.error(f"Error sending test email: {str(e)}")
            raise
    
    def test_all_templates(self, language: str = 'en') -> Dict[str, bool]:
        """Test rendering of all email templates"""
        results = {}
        
        for email_type in EmailType:
            try:
                asyncio.run(self.test_template_rendering(email_type, language))
                results[email_type.value] = True
                logger.info(f"✓ {email_type.value} template OK")
            except Exception as e:
                results[email_type.value] = False
                logger.error(f"✗ {email_type.value} template FAILED: {str(e)}")
        
        return results


# Create test utility instance
email_test_utils = EmailTestUtils()


# Quick test functions
async def quick_test_email(email_type: str, to_email: str, language: str = 'en'):
    """Quick test function for sending a test email"""
    try:
        email_type_enum = EmailType(email_type)
        return await email_test_utils.send_test_email(email_type_enum, to_email, language)
    except ValueError:
        logger.error(f"Invalid email type: {email_type}")
        raise


def run_template_test(language: str = 'en'):
    """Run template rendering test"""
    results = email_test_utils.test_all_templates(language)
    
    total = len(results)
    passed = sum(results.values())
    
    print(f"\n{'='*40}")
    print("EMAIL TEMPLATE TEST RESULTS")
    print(f"{'='*40}")
    print(f"Language: {language}")
    print(f"Passed: {passed}/{total}")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    failed = [k for k, v in results.items() if not v]
    if failed:
        print(f"\nFailed templates:")
        for template in failed:
            print(f"- {template}")
    
    return results 