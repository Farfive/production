"""
SSL/TLS Configuration for Production Outsourcing Platform
Comprehensive SSL setup with security best practices
"""

import ssl
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Union
import os
from dataclasses import dataclass

from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

@dataclass
class SSLConfig:
    """SSL configuration dataclass"""
    cert_file: str
    key_file: str
    ca_file: Optional[str] = None
    verify_mode: int = ssl.CERT_REQUIRED
    check_hostname: bool = True
    protocol: int = ssl.PROTOCOL_TLS_SERVER
    ciphers: Optional[str] = None
    keylog_filename: Optional[str] = None

class SSLManager:
    """
    SSL/TLS Manager for production outsourcing platform
    Handles certificate management, validation, and security configuration
    """
    
    def __init__(self):
        self.ssl_configs = {}
        self.cert_paths = {
            'cert_dir': os.getenv('SSL_CERT_DIR', '/etc/ssl/certs/production-outsourcing/'),
            'key_dir': os.getenv('SSL_KEY_DIR', '/etc/ssl/private/production-outsourcing/'),
            'ca_dir': os.getenv('SSL_CA_DIR', '/etc/ssl/ca/')
        }
        
        # Security-focused cipher suites (TLS 1.3 and strong TLS 1.2)
        self.recommended_ciphers = (
            "ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS"
        )
        
        # TLS 1.3 cipher suites
        self.tls13_ciphers = (
            "TLS_AES_256_GCM_SHA384:"
            "TLS_CHACHA20_POLY1305_SHA256:"
            "TLS_AES_128_GCM_SHA256"
        )
    
    def create_ssl_context(self, 
                          cert_file: str, 
                          key_file: str,
                          ca_file: Optional[str] = None,
                          purpose: ssl.Purpose = ssl.Purpose.SERVER_AUTH,
                          check_hostname: bool = True) -> ssl.SSLContext:
        """
        Create a secure SSL context with best practices
        """
        try:
            # Create SSL context with strong security defaults
            context = ssl.create_default_context(purpose=purpose)
            
            # Set minimum TLS version to 1.2
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            
            # Prefer TLS 1.3 if available
            try:
                context.maximum_version = ssl.TLSVersion.TLSv1_3
            except AttributeError:
                # Fallback for older Python versions
                context.maximum_version = ssl.TLSVersion.TLSv1_2
            
            # Load certificate and private key
            context.load_cert_chain(cert_file, key_file)
            
            # Load CA certificate if provided
            if ca_file and os.path.exists(ca_file):
                context.load_verify_locations(ca_file)
            
            # Security configurations
            context.check_hostname = check_hostname
            context.verify_mode = ssl.CERT_REQUIRED if purpose == ssl.Purpose.CLIENT_AUTH else ssl.CERT_NONE
            
            # Set secure cipher suites
            context.set_ciphers(self.recommended_ciphers)
            
            # Security options
            context.options |= ssl.OP_NO_SSLv2
            context.options |= ssl.OP_NO_SSLv3
            context.options |= ssl.OP_NO_TLSv1
            context.options |= ssl.OP_NO_TLSv1_1
            context.options |= ssl.OP_CIPHER_SERVER_PREFERENCE
            context.options |= ssl.OP_SINGLE_DH_USE
            context.options |= ssl.OP_SINGLE_ECDH_USE
            
            # Disable compression to prevent CRIME attacks
            context.options |= ssl.OP_NO_COMPRESSION
            
            logger.info(f"SSL context created successfully for {cert_file}")
            return context
            
        except Exception as e:
            logger.error(f"Failed to create SSL context: {e}")
            raise
    
    def validate_certificate(self, cert_file: str) -> Dict[str, Any]:
        """
        Validate SSL certificate and return information
        """
        import OpenSSL.crypto
        from datetime import datetime, timezone
        
        try:
            with open(cert_file, 'rb') as f:
                cert_data = f.read()
            
            cert = OpenSSL.crypto.load_certificate(OpenSSL.crypto.FILETYPE_PEM, cert_data)
            
            # Extract certificate information
            subject = cert.get_subject()
            issuer = cert.get_issuer()
            
            # Check expiration
            not_after = datetime.strptime(cert.get_notAfter().decode('ascii'), '%Y%m%d%H%M%SZ')
            not_before = datetime.strptime(cert.get_notBefore().decode('ascii'), '%Y%m%d%H%M%SZ')
            
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            days_until_expiry = (not_after - now).days
            
            validation_result = {
                'valid': True,
                'subject': {
                    'common_name': subject.CN,
                    'organization': getattr(subject, 'O', None),
                    'country': getattr(subject, 'C', None)
                },
                'issuer': {
                    'common_name': issuer.CN,
                    'organization': getattr(issuer, 'O', None)
                },
                'validity': {
                    'not_before': not_before.isoformat(),
                    'not_after': not_after.isoformat(),
                    'days_until_expiry': days_until_expiry,
                    'is_expired': now > not_after,
                    'is_valid_now': not_before <= now <= not_after
                },
                'serial_number': str(cert.get_serial_number()),
                'version': cert.get_version() + 1,
                'signature_algorithm': cert.get_signature_algorithm().decode('ascii')
            }
            
            # Security warnings
            warnings = []
            if days_until_expiry < 30:
                warnings.append(f"Certificate expires in {days_until_expiry} days")
            if days_until_expiry < 0:
                warnings.append("Certificate has expired")
            if cert.get_signature_algorithm().decode('ascii').lower().startswith('sha1'):
                warnings.append("Certificate uses weak SHA-1 signature algorithm")
            
            validation_result['warnings'] = warnings
            
            logger.info(f"Certificate validation completed for {cert_file}")
            return validation_result
            
        except Exception as e:
            logger.error(f"Certificate validation failed for {cert_file}: {e}")
            return {
                'valid': False,
                'error': str(e),
                'warnings': ['Certificate validation failed']
            }
    
    def setup_production_ssl(self) -> Dict[str, SSLConfig]:
        """
        Setup SSL configuration for production environment
        """
        config = {
            'api_server': SSLConfig(
                cert_file=os.path.join(self.cert_paths['cert_dir'], 'api.production-outsourcing.com.crt'),
                key_file=os.path.join(self.cert_paths['key_dir'], 'api.production-outsourcing.com.key'),
                ca_file=os.path.join(self.cert_paths['ca_dir'], 'ca-bundle.crt')
            ),
            'webapp': SSLConfig(
                cert_file=os.path.join(self.cert_paths['cert_dir'], 'www.production-outsourcing.com.crt'),
                key_file=os.path.join(self.cert_paths['key_dir'], 'www.production-outsourcing.com.key'),
                ca_file=os.path.join(self.cert_paths['ca_dir'], 'ca-bundle.crt')
            ),
            'database': SSLConfig(
                cert_file=os.path.join(self.cert_paths['cert_dir'], 'db.production-outsourcing.com.crt'),
                key_file=os.path.join(self.cert_paths['key_dir'], 'db.production-outsourcing.com.key'),
                ca_file=os.path.join(self.cert_paths['ca_dir'], 'ca-bundle.crt')
            )
        }
        
        return config
    
    def generate_self_signed_cert(self, hostname: str, output_dir: str) -> Dict[str, str]:
        """
        Generate self-signed certificate for development/testing
        """
        from OpenSSL import crypto
        import ipaddress
        
        try:
            # Create output directory
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            
            # Create key pair
            key = crypto.PKey()
            key.generate_key(crypto.TYPE_RSA, 2048)
            
            # Create certificate
            cert = crypto.X509()
            cert.get_subject().C = "PL"
            cert.get_subject().ST = "Mazowieckie"
            cert.get_subject().L = "Warsaw"
            cert.get_subject().O = "Production Outsourcing Platform"
            cert.get_subject().OU = "Development"
            cert.get_subject().CN = hostname
            
            # Add Subject Alternative Names
            san_list = [f"DNS:{hostname}"]
            
            # Add localhost and common development hostnames
            if hostname != "localhost":
                san_list.extend(["DNS:localhost", "DNS:127.0.0.1", "IP:127.0.0.1"])
            
            # Try to parse as IP address
            try:
                ip = ipaddress.ip_address(hostname)
                san_list.append(f"IP:{hostname}")
            except ValueError:
                pass
            
            # Set certificate properties
            cert.set_serial_number(1000)
            cert.gmtime_adj_notBefore(0)
            cert.gmtime_adj_notAfter(365 * 24 * 60 * 60)  # Valid for 1 year
            cert.set_issuer(cert.get_subject())
            cert.set_pubkey(key)
            
            # Add extensions
            cert.add_extensions([
                crypto.X509Extension(b"subjectAltName", False, ",".join(san_list).encode()),
                crypto.X509Extension(b"basicConstraints", True, b"CA:FALSE"),
                crypto.X509Extension(b"keyUsage", True, b"digitalSignature,keyEncipherment"),
                crypto.X509Extension(b"extendedKeyUsage", True, b"serverAuth"),
            ])
            
            cert.sign(key, 'sha256')
            
            # Save certificate and key
            cert_file = os.path.join(output_dir, f"{hostname}.crt")
            key_file = os.path.join(output_dir, f"{hostname}.key")
            
            with open(cert_file, "wb") as f:
                f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert))
            
            with open(key_file, "wb") as f:
                f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, key))
            
            # Set secure permissions
            os.chmod(key_file, 0o600)
            os.chmod(cert_file, 0o644)
            
            logger.info(f"Self-signed certificate generated for {hostname}")
            
            return {
                'cert_file': cert_file,
                'key_file': key_file,
                'hostname': hostname,
                'valid_until': '1 year from generation'
            }
            
        except Exception as e:
            logger.error(f"Failed to generate self-signed certificate: {e}")
            raise
    
    def setup_nginx_ssl_config(self) -> str:
        """
        Generate Nginx SSL configuration
        """
        return """
# SSL Configuration for Production Outsourcing Platform
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# SSL Session Settings
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;

# Security Headers
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";

# Certificate Configuration
ssl_certificate /etc/ssl/certs/production-outsourcing/www.production-outsourcing.com.crt;
ssl_certificate_key /etc/ssl/private/production-outsourcing/www.production-outsourcing.com.key;
ssl_trusted_certificate /etc/ssl/ca/ca-bundle.crt;

# DH Parameters (generate with: openssl dhparam -out /etc/ssl/dhparam.pem 2048)
ssl_dhparam /etc/ssl/dhparam.pem;
        """
    
    def check_ssl_expiry(self, cert_files: list) -> Dict[str, Any]:
        """
        Check SSL certificate expiry for multiple certificates
        """
        results = {}
        
        for cert_file in cert_files:
            if os.path.exists(cert_file):
                validation = self.validate_certificate(cert_file)
                results[cert_file] = {
                    'days_until_expiry': validation.get('validity', {}).get('days_until_expiry', 0),
                    'is_expired': validation.get('validity', {}).get('is_expired', True),
                    'warnings': validation.get('warnings', [])
                }
            else:
                results[cert_file] = {
                    'error': 'Certificate file not found',
                    'days_until_expiry': 0,
                    'is_expired': True,
                    'warnings': ['Certificate file missing']
                }
        
        return results

# Global SSL manager instance
ssl_manager = SSLManager()

def get_ssl_context_for_service(service: str) -> Optional[ssl.SSLContext]:
    """
    Get SSL context for a specific service
    """
    try:
        config = ssl_manager.setup_production_ssl()
        
        if service in config:
            service_config = config[service]
            return ssl_manager.create_ssl_context(
                cert_file=service_config.cert_file,
                key_file=service_config.key_file,
                ca_file=service_config.ca_file
            )
        else:
            logger.warning(f"SSL configuration not found for service: {service}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to get SSL context for {service}: {e}")
        return None

def validate_ssl_setup() -> Dict[str, Any]:
    """
    Validate complete SSL setup
    """
    results = {
        'valid': True,
        'services': {},
        'issues': []
    }
    
    config = ssl_manager.setup_production_ssl()
    
    for service, service_config in config.items():
        cert_file = service_config.cert_file
        key_file = service_config.key_file
        
        service_result = {
            'cert_exists': os.path.exists(cert_file),
            'key_exists': os.path.exists(key_file),
            'validation': None
        }
        
        if service_result['cert_exists']:
            service_result['validation'] = ssl_manager.validate_certificate(cert_file)
            
            if not service_result['validation']['valid']:
                results['valid'] = False
                results['issues'].append(f"Invalid certificate for {service}")
        else:
            results['valid'] = False
            results['issues'].append(f"Missing certificate file for {service}: {cert_file}")
        
        if not service_result['key_exists']:
            results['valid'] = False
            results['issues'].append(f"Missing private key file for {service}: {key_file}")
        
        results['services'][service] = service_result
    
    return results 