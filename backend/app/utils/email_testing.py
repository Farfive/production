import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import webbrowser
from jinja2 import Environment, FileSystemLoader

from app.services.email import EmailType, email_service
from app.services.email_templates import template_manager
from app.tasks.email_tasks import send_email_task, schedule_email, send_email_campaign
from loguru import logger


class EmailTestUtils:
    """Utilities for testing email templates and functionality"""
    
    def __init__(self):
        self.test_data = self._generate_test_data()
    
    def _generate_test_data(self) -> Dict[str, Any]:
        """Generate comprehensive test data for all email types"""
        return {
            EmailType.VERIFICATION: {
                'first_name': 'Jan',
                'verification_link': 'https://manufacturingplatform.com/verify?token=test123',
                'verification_token': 'test123'
            },
            EmailType.WELCOME: {
                'first_name': 'Anna',
                'login_link': 'https://manufacturingplatform.com/login',
                'dashboard_link': 'https://manufacturingplatform.com/dashboard'
            },
            EmailType.ORDER_CONFIRMATION: {
                'client_name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych',
                    'quantity': 1000,
                    'material': 'Stal nierdzewna 316L',
                    'budget_max_pln': 25000.00,
                    'delivery_deadline': '2024-03-15',
                    'technical_requirements': {
                        'tolerance': '±0.1mm',
                        'surface_finish': 'Ra 0.8μm',
                        'heat_treatment': 'Normalizowanie'
                    }
                },
                'order_link': 'https://manufacturingplatform.com/orders/12345',
                'estimated_matching_time': '24-48 godzin'
            },
            EmailType.ORDER_RECEIVED: {
                'manufacturer_name': 'Zakład Metalowy Nowak Sp. z o.o.',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych',
                    'quantity': 1000,
                    'material': 'Stal nierdzewna 316L',
                    'budget_max_pln': 25000.00,
                    'delivery_deadline': '2024-03-15'
                },
                'quote_link': 'https://manufacturingplatform.com/manufacturer/orders/12345/quote',
                'quote_deadline': 'W ciągu 3 dni',
                'order_value_estimate': '20,000 - 25,000 PLN'
            },
            EmailType.QUOTE_RECEIVED: {
                'client_name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych'
                },
                'quote': {
                    'id': 67890,
                    'price': 22500.00,
                    'lead_time_days': 14,
                    'estimated_delivery': '2024-03-01',
                    'warranty_months': 12,
                    'payment_terms': '50% zaliczka, 50% przed wysyłką',
                    'notes': 'Cena zawiera obróbkę CNC, kontrolę jakości i pakowanie.'
                },
                'manufacturer': {
                    'business_name': 'Zakład Metalowy Nowak Sp. z o.o.',
                    'location': 'Warszawa, Polska',
                    'rating': 4.8
                },
                'review_link': 'https://manufacturingplatform.com/orders/12345/quotes/67890',
                'response_deadline': '7 dni'
            },
            EmailType.PRODUCTION_STARTED: {
                'client_name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych'
                },
                'manufacturer': {
                    'business_name': 'Zakład Metalowy Nowak Sp. z o.o.',
                    'contact_person': 'Tomasz Nowak'
                },
                'tracking_link': 'https://manufacturingplatform.com/orders/12345/tracking',
                'estimated_completion': '2024-02-28',
                'production_start_date': datetime.now().strftime('%Y-%m-%d')
            },
            EmailType.PAYMENT_CONFIRMED: {
                'name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych'
                },
                'payment': {
                    'amount': 11250.00,
                    'payment_method': 'Karta kredytowa',
                    'transaction_id': 'TXN_98765432',
                    'payment_date': datetime.now().strftime('%Y-%m-%d')
                },
                'receipt_link': 'https://manufacturingplatform.com/orders/12345/receipt'
            },
            EmailType.DELIVERY_SHIPPED: {
                'client_name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych',
                    'shipping_address': 'ul. Przemysłowa 15, 02-676 Warszawa'
                },
                'tracking_number': 'DPD123456789',
                'carrier': 'DPD Polska',
                'tracking_link': 'https://trackyourparcel.dpd.com.pl/123456789',
                'estimated_delivery': '2024-03-02',
                'shipping_address': 'ul. Przemysłowa 15, 02-676 Warszawa'
            },
            EmailType.DEADLINE_REMINDER: {
                'name': 'Marek Kowalski',
                'order': {
                    'id': 12345,
                    'title': 'Produkcja 1000 elementów stalowych',
                    'delivery_deadline': '2024-03-15'
                },
                'order_link': 'https://manufacturingplatform.com/orders/12345',
                'days_remaining': 3,
                'deadline_date': '2024-03-15'
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
    
    def preview_email_in_browser(self, email_type: EmailType, language: str = 'en'):
        """Generate and open email preview in browser"""
        try:
            rendered = asyncio.run(self.test_template_rendering(email_type, language))
            
            # Create temporary HTML file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
                f.write(rendered['html_content'])
                temp_path = f.name
            
            # Open in browser
            webbrowser.open(f'file://{temp_path}')
            logger.info(f"Opened email preview for {email_type.value} in browser")
            
            return temp_path
            
        except Exception as e:
            logger.error(f"Failed to preview email: {str(e)}")
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
            else:
                logger.warning(f"Failed to send test email {email_type.value} to {to_email}")
            
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
    
    def test_celery_integration(self, to_email: str) -> str:
        """Test Celery email task"""
        try:
            # Test basic email task
            email_data = {
                'id': f"test_{datetime.now().timestamp()}",
                'email_type': EmailType.VERIFICATION.value,
                'to_email': to_email,
                'to_name': 'Test User',
                'retry_count': 0,
                'max_retries': 3
            }
            
            rendered = template_manager.render_template(
                EmailType.VERIFICATION.value,
                self.test_data[EmailType.VERIFICATION],
                'en'
            )
            
            # Queue the task
            task = send_email_task.delay(email_data, rendered)
            
            logger.info(f"Queued test email task: {task.id}")
            return task.id
            
        except Exception as e:
            logger.error(f"Celery test failed: {str(e)}")
            raise
    
    def test_scheduled_email(self, to_email: str, delay_minutes: int = 2) -> None:
        """Test scheduled email functionality"""
        try:
            send_at = datetime.now() + timedelta(minutes=delay_minutes)
            
            schedule_email(
                email_type=EmailType.WELCOME,
                to_email=to_email,
                to_name='Scheduled Test User',
                context=self.test_data[EmailType.WELCOME],
                send_at=send_at,
                language='en'
            )
            
            logger.info(f"Scheduled test email for {to_email} at {send_at}")
            
        except Exception as e:
            logger.error(f"Scheduled email test failed: {str(e)}")
            raise
    
    def test_bulk_email(self, email_list: List[str], template_name: str = 'welcome') -> List[str]:
        """Test bulk email campaign"""
        try:
            recipients = []
            for email in email_list:
                recipients.append({
                    'email': email,
                    'context': {'first_name': 'Test User'},
                    'language': 'en'
                })
            
            common_context = {
                'campaign_name': 'Test Campaign',
                'campaign_date': datetime.now().strftime('%Y-%m-%d')
            }
            
            task_ids = send_email_campaign(template_name, recipients, common_context)
            
            logger.info(f"Started bulk email test campaign with {len(task_ids)} tasks")
            return task_ids
            
        except Exception as e:
            logger.error(f"Bulk email test failed: {str(e)}")
            raise
    
    def generate_email_report(self, language: str = 'en') -> Dict[str, Any]:
        """Generate comprehensive email system test report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'language': language,
            'template_tests': {},
            'system_status': {},
            'recommendations': []
        }
        
        # Test all templates
        template_results = self.test_all_templates(language)
        report['template_tests'] = template_results
        
        # Check system components
        report['system_status'] = {
            'email_service_available': email_service is not None,
            'template_manager_available': template_manager is not None,
            'redis_available': email_service.redis is not None if email_service else False,
            'tracking_available': email_service.tracker is not None if email_service else False,
            'unsubscribe_manager_available': email_service.unsubscribe_manager is not None if email_service else False
        }
        
        # Generate recommendations
        failed_templates = [k for k, v in template_results.items() if not v]
        if failed_templates:
            report['recommendations'].append(f"Fix failed templates: {', '.join(failed_templates)}")
        
        if not report['system_status']['redis_available']:
            report['recommendations'].append("Configure Redis for email tracking and unsubscribe management")
        
        # Summary
        total_templates = len(template_results)
        passed_templates = sum(template_results.values())
        report['summary'] = {
            'total_templates': total_templates,
            'passed_templates': passed_templates,
            'failed_templates': total_templates - passed_templates,
            'success_rate': (passed_templates / total_templates) * 100 if total_templates > 0 else 0
        }
        
        return report
    
    def save_report(self, report: Dict[str, Any], filename: str = None) -> str:
        """Save email test report to file"""
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"email_test_report_{timestamp}.json"
        
        report_path = Path(filename)
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Email test report saved to: {report_path}")
        return str(report_path)


# Create test utility instance
email_test_utils = EmailTestUtils()


# Convenience functions for quick testing
async def quick_test_email(email_type: str, to_email: str, language: str = 'en'):
    """Quick test function for sending a test email"""
    try:
        email_type_enum = EmailType(email_type)
        return await email_test_utils.send_test_email(email_type_enum, to_email, language)
    except ValueError:
        logger.error(f"Invalid email type: {email_type}")
        raise


def preview_email(email_type: str, language: str = 'en'):
    """Quick function to preview email in browser"""
    try:
        email_type_enum = EmailType(email_type)
        return email_test_utils.preview_email_in_browser(email_type_enum, language)
    except ValueError:
        logger.error(f"Invalid email type: {email_type}")
        raise


def run_full_email_test(language: str = 'en'):
    """Run comprehensive email system test"""
    report = email_test_utils.generate_email_report(language)
    report_path = email_test_utils.save_report(report)
    
    print(f"\n{'='*50}")
    print("EMAIL SYSTEM TEST REPORT")
    print(f"{'='*50}")
    print(f"Language: {report['language']}")
    print(f"Timestamp: {report['timestamp']}")
    print(f"\nTemplate Tests: {report['summary']['passed_templates']}/{report['summary']['total_templates']} passed")
    print(f"Success Rate: {report['summary']['success_rate']:.1f}%")
    
    if report['recommendations']:
        print(f"\nRecommendations:")
        for rec in report['recommendations']:
            print(f"- {rec}")
    
    print(f"\nFull report saved to: {report_path}")
    
    return report 