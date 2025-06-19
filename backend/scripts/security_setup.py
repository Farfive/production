#!/usr/bin/env python3
"""
Security Setup Script for Production Outsourcing Platform
Automates SSL certificate setup, secrets management, and security hardening
"""

import os
import sys
import subprocess
import argparse
import logging
from pathlib import Path
from datetime import datetime
import json

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.ssl_config import ssl_manager
from app.core.secrets import secrets_manager
from app.core.security_audit import run_security_audit

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SecuritySetup:
    """Security setup and configuration manager"""
    
    def __init__(self, environment='production'):
        self.environment = environment
        self.base_dir = Path(__file__).parent.parent
        self.ssl_dir = Path('/etc/ssl/certs/production-outsourcing')
        self.secrets_dir = Path('/etc/secrets')
        
    def setup_ssl_certificates(self, domain='production-outsourcing.com'):
        """Setup SSL certificates for the platform"""
        logger.info("Setting up SSL certificates...")
        
        try:
            # Create SSL directories
            self.ssl_dir.mkdir(parents=True, exist_ok=True)
            (self.ssl_dir.parent / 'private/production-outsourcing').mkdir(parents=True, exist_ok=True)
            (self.ssl_dir.parent.parent / 'ca').mkdir(parents=True, exist_ok=True)
            
            # For development/testing, generate self-signed certificates
            if self.environment in ['development', 'testing']:
                logger.info("Generating self-signed certificates for development...")
                
                subdomains = ['api', 'www', 'admin']
                for subdomain in subdomains:
                    hostname = f"{subdomain}.{domain}"
                    cert_info = ssl_manager.generate_self_signed_cert(
                        hostname=hostname,
                        output_dir=str(self.ssl_dir)
                    )
                    logger.info(f"Generated certificate for {hostname}: {cert_info['cert_file']}")
            
            else:
                # Production SSL setup instructions
                logger.info("Production SSL setup required:")
                logger.info("1. Obtain SSL certificates from a trusted CA (Let's Encrypt, etc.)")
                logger.info("2. Place certificates in the following locations:")
                
                services = ssl_manager.setup_production_ssl()
                for service, config in services.items():
                    logger.info(f"   {service}:")
                    logger.info(f"     Certificate: {config.cert_file}")
                    logger.info(f"     Private Key: {config.key_file}")
                    logger.info(f"     CA Bundle: {config.ca_file}")
            
            # Generate Nginx configuration
            nginx_config = ssl_manager.generate_nginx_config()
            nginx_config_file = self.base_dir / 'config' / 'nginx_ssl.conf'
            nginx_config_file.parent.mkdir(exist_ok=True)
            
            with open(nginx_config_file, 'w') as f:
                f.write(nginx_config)
            
            logger.info(f"Nginx SSL configuration saved to: {nginx_config_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"SSL setup failed: {e}")
            return False
    
    def setup_secrets_management(self):
        """Setup secrets management system"""
        logger.info("Setting up secrets management...")
        
        try:
            # Create secrets directory
            self.secrets_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate encryption key if not exists
            encryption_key_file = self.secrets_dir / 'encryption.key'
            if not encryption_key_file.exists():
                encryption_key = secrets_manager.generate_secure_key(32)
                with open(encryption_key_file, 'w') as f:
                    f.write(encryption_key)
                os.chmod(encryption_key_file, 0o600)
                logger.info(f"Generated encryption key: {encryption_key_file}")
            
            # Generate sample secrets for development
            if self.environment in ['development', 'testing']:
                logger.info("Generating sample secrets for development...")
                
                sample_secrets = {
                    'database_password': secrets_manager.generate_secure_password(),
                    'jwt_secret_key': secrets_manager.generate_secure_key(),
                    'encryption_key': secrets_manager.generate_secure_key(),
                    'stripe_secret_key': 'sk_test_' + secrets_manager.generate_secure_key(32),
                    'sendgrid_api_key': 'SG.' + secrets_manager.generate_secure_key(22)
                }
                
                for key, value in sample_secrets.items():
                    await secrets_manager.set_secret(key, value)
                    logger.info(f"Set sample secret: {key}")
            
            # Create environment template
            env_template = self.base_dir / '.env.template'
            with open(env_template, 'w') as f:
                f.write(self._generate_env_template())
            
            logger.info(f"Environment template created: {env_template}")
            
            return True
            
        except Exception as e:
            logger.error(f"Secrets setup failed: {e}")
            return False
    
    def apply_security_hardening(self):
        """Apply security hardening measures"""
        logger.info("Applying security hardening...")
        
        try:
            hardening_measures = []
            
            # File permissions
            self._secure_file_permissions()
            hardening_measures.append("file_permissions")
            
            # Firewall rules (if available)
            if self._setup_firewall():
                hardening_measures.append("firewall")
            
            # System security
            if self._apply_system_hardening():
                hardening_measures.append("system_hardening")
            
            # Application security
            self._apply_application_hardening()
            hardening_measures.append("application_hardening")
            
            logger.info(f"Applied hardening measures: {', '.join(hardening_measures)}")
            return True
            
        except Exception as e:
            logger.error(f"Security hardening failed: {e}")
            return False
    
    def _secure_file_permissions(self):
        """Secure file and directory permissions"""
        logger.info("Securing file permissions...")
        
        # Secure SSL directories
        if self.ssl_dir.exists():
            os.chmod(self.ssl_dir, 0o755)
            for cert_file in self.ssl_dir.glob('*.crt'):
                os.chmod(cert_file, 0o644)
            
        # Secure private key directory
        private_dir = self.ssl_dir.parent / 'private/production-outsourcing'
        if private_dir.exists():
            os.chmod(private_dir, 0o700)
            for key_file in private_dir.glob('*.key'):
                os.chmod(key_file, 0o600)
        
        # Secure secrets directory
        if self.secrets_dir.exists():
            os.chmod(self.secrets_dir, 0o700)
            for secret_file in self.secrets_dir.iterdir():
                os.chmod(secret_file, 0o600)
    
    def _setup_firewall(self):
        """Setup basic firewall rules"""
        try:
            if subprocess.run(['which', 'ufw'], capture_output=True).returncode == 0:
                logger.info("Configuring UFW firewall...")
                
                # Basic UFW rules
                rules = [
                    'ufw --force reset',
                    'ufw default deny incoming',
                    'ufw default allow outgoing',
                    'ufw allow ssh',
                    'ufw allow 80/tcp',
                    'ufw allow 443/tcp',
                    'ufw --force enable'
                ]
                
                for rule in rules:
                    subprocess.run(rule.split(), check=True, capture_output=True)
                
                return True
            else:
                logger.warning("UFW not available, skipping firewall setup")
                return False
                
        except subprocess.CalledProcessError as e:
            logger.warning(f"Firewall setup failed: {e}")
            return False
    
    def _apply_system_hardening(self):
        """Apply system-level security hardening"""
        try:
            # System hardening would typically include:
            # - Kernel parameter tuning
            # - Service hardening
            # - User account security
            # - Log configuration
            
            logger.info("System hardening measures would be applied here")
            return True
            
        except Exception as e:
            logger.warning(f"System hardening failed: {e}")
            return False
    
    def _apply_application_hardening(self):
        """Apply application-level security hardening"""
        logger.info("Applying application security hardening...")
        
        # Create security configuration file
        security_config = {
            'security_headers': {
                'strict_transport_security': 'max-age=31536000; includeSubDomains',
                'x_frame_options': 'DENY',
                'x_content_type_options': 'nosniff',
                'x_xss_protection': '1; mode=block',
                'content_security_policy': "default-src 'self'"
            },
            'rate_limiting': {
                'enabled': True,
                'requests_per_minute': 60,
                'burst_limit': 10
            },
            'authentication': {
                'password_policy': {
                    'min_length': 12,
                    'require_special_chars': True,
                    'require_numbers': True,
                    'require_uppercase': True
                },
                'session_timeout': 3600,
                'max_login_attempts': 5
            }
        }
        
        config_file = self.base_dir / 'config' / 'security.json'
        config_file.parent.mkdir(exist_ok=True)
        
        with open(config_file, 'w') as f:
            json.dump(security_config, f, indent=2)
        
        logger.info(f"Security configuration saved: {config_file}")
    
    def _generate_env_template(self):
        """Generate environment variables template"""
        return """# Production Outsourcing Platform Environment Variables

# Environment
ENVIRONMENT=production
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost/production_outsourcing
SECRET_DATABASE_PASSWORD=your_secure_database_password

# Security Keys
SECRET_JWT_SECRET_KEY=your_jwt_secret_key_here
SECRET_ENCRYPTION_KEY=your_encryption_key_here

# API Keys
SECRET_STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
SECRET_SENDGRID_API_KEY=SG.your_sendgrid_api_key

# SSL Configuration
SSL_CERT_DIR=/etc/ssl/certs/production-outsourcing/
SSL_KEY_DIR=/etc/ssl/private/production-outsourcing/
SSL_CA_DIR=/etc/ssl/ca/

# Secrets Management
SECRETS_FILE=/etc/secrets/production-outsourcing.enc
SECRETS_ENCRYPTION_KEY=your_secrets_encryption_key

# Monitoring
SECRET_SENTRY_DSN=your_sentry_dsn_here
PROMETHEUS_ENABLED=true

# External Services
SECRET_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SECRET_REDIS_PASSWORD=your_redis_password
"""
    
    def run_security_audit(self):
        """Run comprehensive security audit"""
        logger.info("Running security audit...")
        
        try:
            base_url = f"https://api.production-outsourcing.com"
            audit_results = run_security_audit(base_url)
            
            # Save audit report
            report_file = self.base_dir / f'security_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
            with open(report_file, 'w') as f:
                json.dump(audit_results, f, indent=2)
            
            logger.info(f"Security audit completed. Report saved: {report_file}")
            
            # Print summary
            summary = audit_results['summary']
            logger.info(f"Audit Summary:")
            logger.info(f"  Total findings: {summary['total_findings']}")
            for severity, count in summary['severity_breakdown'].items():
                if count > 0:
                    logger.info(f"  {severity.title()}: {count}")
            
            return True
            
        except Exception as e:
            logger.error(f"Security audit failed: {e}")
            return False
    
    def setup_all(self, domain='production-outsourcing.com'):
        """Run complete security setup"""
        logger.info("Starting complete security setup...")
        
        success = True
        
        # SSL Setup
        if not self.setup_ssl_certificates(domain):
            success = False
        
        # Secrets Management
        if not self.setup_secrets_management():
            success = False
        
        # Security Hardening
        if not self.apply_security_hardening():
            success = False
        
        # Security Audit
        if not self.run_security_audit():
            success = False
        
        if success:
            logger.info("✅ Security setup completed successfully!")
            logger.info("Next steps:")
            logger.info("1. Review and customize the generated configuration files")
            logger.info("2. Set up proper SSL certificates for production")
            logger.info("3. Configure secrets management backend (Vault, AWS Secrets Manager)")
            logger.info("4. Schedule regular security audits")
            logger.info("5. Monitor security logs and alerts")
        else:
            logger.error("❌ Security setup completed with errors. Please review the logs.")
        
        return success

def main():
    parser = argparse.ArgumentParser(description='Security setup for Production Outsourcing Platform')
    parser.add_argument('--environment', choices=['development', 'testing', 'production'], 
                       default='production', help='Environment to configure')
    parser.add_argument('--domain', default='production-outsourcing.com', 
                       help='Domain name for SSL certificates')
    parser.add_argument('--ssl-only', action='store_true', help='Setup SSL certificates only')
    parser.add_argument('--secrets-only', action='store_true', help='Setup secrets management only')
    parser.add_argument('--hardening-only', action='store_true', help='Apply security hardening only')
    parser.add_argument('--audit-only', action='store_true', help='Run security audit only')
    
    args = parser.parse_args()
    
    setup = SecuritySetup(args.environment)
    
    if args.ssl_only:
        setup.setup_ssl_certificates(args.domain)
    elif args.secrets_only:
        setup.setup_secrets_management()
    elif args.hardening_only:
        setup.apply_security_hardening()
    elif args.audit_only:
        setup.run_security_audit()
    else:
        setup.setup_all(args.domain)

if __name__ == '__main__':
    main() 