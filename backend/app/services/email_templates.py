import os
from typing import Dict, Any, Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape, TemplateNotFound
from datetime import datetime
from loguru import logger


class EmailTemplateManager:
    """Template management with multi-language support"""
    
    def __init__(self, template_dir: str = None):
        if template_dir is None:
            template_dir = os.path.join(os.path.dirname(__file__), '..', 'templates', 'emails')
        
        self.template_dir = Path(template_dir)
        self.jinja_envs: Dict[str, Environment] = {}
        
        # Setup Jinja environments for each language
        self._setup_jinja_environments()
    
    def _setup_jinja_environments(self):
        """Setup Jinja2 environments for different languages"""
        languages = ['en', 'pl']  # English and Polish
        
        for lang in languages:
            lang_dir = self.template_dir / lang
            if not lang_dir.exists():
                lang_dir.mkdir(parents=True, exist_ok=True)
            
            self.jinja_envs[lang] = Environment(
                loader=FileSystemLoader(str(lang_dir)),
                autoescape=select_autoescape(['html', 'xml']),
                trim_blocks=True,
                lstrip_blocks=True
            )
            
            # Add custom filters
            self.jinja_envs[lang].filters['currency'] = self._currency_filter
            self.jinja_envs[lang].filters['datetime'] = self._datetime_filter
    
    def _currency_filter(self, value: float, currency: str = 'PLN') -> str:
        """Format currency values"""
        if currency == 'PLN':
            return f"{value:,.2f} zł"
        elif currency == 'EUR':
            return f"€{value:,.2f}"
        elif currency == 'USD':
            return f"${value:,.2f}"
        return f"{value:,.2f} {currency}"
    
    def _datetime_filter(self, value, format: str = '%Y-%m-%d %H:%M') -> str:
        """Format datetime values"""
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except:
                return value
        elif isinstance(value, datetime):
            return value.strftime(format)
        return str(value)
    
    def render_template(self, template_name: str, context: Dict[str, Any], language: str = 'en') -> Dict[str, str]:
        """Render email template with context"""
        jinja_env = self.jinja_envs.get(language, self.jinja_envs.get('en'))
        if not jinja_env:
            raise ValueError(f"No Jinja environment available")
        
        try:
            # Add common context variables
            common_context = {
                'platform_name': 'Manufacturing Platform',
                'support_email': 'support@manufacturingplatform.com',
                'company_address': 'Manufacturing Platform, Warsaw, Poland',
                'unsubscribe_url': f"https://manufacturingplatform.com/unsubscribe",
                'current_year': datetime.now().year,
                **context
            }
            
            # Get subject template
            try:
                subject_template = jinja_env.get_template(f"{template_name}_subject.txt")
                subject = subject_template.render(common_context).strip()
            except TemplateNotFound:
                # Fallback subject
                subject = f"Manufacturing Platform - {template_name.replace('_', ' ').title()}"
            
            # Get HTML template
            html_template = jinja_env.get_template(f"{template_name}.html")
            html_content = html_template.render(common_context)
            
            # Get text template if available
            text_content = None
            try:
                text_template = jinja_env.get_template(f"{template_name}.txt")
                text_content = text_template.render(common_context)
            except TemplateNotFound:
                logger.debug(f"Text template {template_name}.txt not found for language {language}")
            
            return {
                'subject': subject,
                'html_content': html_content,
                'text_content': text_content
            }
        
        except TemplateNotFound as e:
            logger.error(f"Template not found: {e}")
            raise
        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            raise


# Create template manager instance
template_manager = EmailTemplateManager() 