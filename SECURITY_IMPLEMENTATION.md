# Security Implementation Guide - Week 1: Security & SSL

This document provides a comprehensive implementation guide for SSL/TLS configuration, production secrets management, and security audit tools for the Production Outsourcing Platform.

## Overview

The security implementation includes:
- **SSL/TLS Configuration**: Certificate management and secure communication
- **Production Secrets Management**: Encrypted secrets storage and rotation
- **Security Auditing**: Vulnerability assessment and penetration testing tools
- **Security Hardening**: Application and system-level security measures

## 1. SSL/TLS Configuration

### 1.1 SSL Certificate Setup

#### Production Environment

1. **Obtain SSL Certificates**
   ```bash
   # Using Let's Encrypt (recommended)
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d api.production-outsourcing.com
   sudo certbot certonly --nginx -d www.production-outsourcing.com
   sudo certbot certonly --nginx -d admin.production-outsourcing.com
   ```

2. **Certificate Locations**
   - API Server: `/etc/ssl/certs/production-outsourcing/api.production-outsourcing.com.crt`
   - Web App: `/etc/ssl/certs/production-outsourcing/www.production-outsourcing.com.crt`
   - Admin Panel: `/etc/ssl/certs/production-outsourcing/admin.production-outsourcing.com.crt`

3. **Private Keys**
   - Store in: `/etc/ssl/private/production-outsourcing/`
   - Set permissions: `chmod 600 *.key`

#### Development Environment

```bash
# Run the security setup script for development
python3 backend/scripts/security_setup.py --environment development --domain localhost
```

### 1.2 Nginx SSL Configuration

```nginx
# /etc/nginx/sites-available/production-outsourcing
server {
    listen 443 ssl http2;
    server_name api.production-outsourcing.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/production-outsourcing/api.production-outsourcing.com.crt;
    ssl_certificate_key /etc/ssl/private/production-outsourcing/api.production-outsourcing.com.key;
    ssl_trusted_certificate /etc/ssl/ca/ca-bundle.crt;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # TLS Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.production-outsourcing.com www.production-outsourcing.com;
    return 301 https://$server_name$request_uri;
}
```

### 1.3 SSL Validation

```bash
# Test SSL configuration
curl -I https://api.production-outsourcing.com/health

# Check certificate expiry
openssl x509 -in /etc/ssl/certs/production-outsourcing/api.production-outsourcing.com.crt -text -noout | grep "Not After"

# Validate SSL setup via API
curl -X POST https://api.production-outsourcing.com/api/v1/security/ssl/validate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 2. Production Secrets Management

### 2.1 Environment Variables

Create a `.env` file based on the template:

```bash
# Copy template and customize
cp backend/.env.template backend/.env
```

### 2.2 Required Secrets

| Secret Key | Description | Required | Rotation Period |
|------------|-------------|----------|-----------------|
| `SECRET_DATABASE_PASSWORD` | Database password | Yes | 30 days |
| `SECRET_JWT_SECRET_KEY` | JWT signing key | Yes | 30 days |
| `SECRET_ENCRYPTION_KEY` | Application encryption | Yes | 90 days |
| `SECRET_STRIPE_SECRET_KEY` | Stripe API key | Yes | 365 days |
| `SECRET_SENDGRID_API_KEY` | Email service key | No | 180 days |
| `SECRET_SENTRY_DSN` | Error tracking | No | 365 days |

### 2.3 Secrets Configuration

#### Environment Variables (Development)
```bash
export SECRET_DATABASE_PASSWORD="your_secure_database_password"
export SECRET_JWT_SECRET_KEY="your_jwt_secret_key_32_chars_min"
export SECRET_ENCRYPTION_KEY="your_encryption_key_32_chars_min"
export SECRET_STRIPE_SECRET_KEY="sk_live_your_stripe_key"
export SECRETS_ENCRYPTION_KEY="your_secrets_file_encryption_key"
```

#### Encrypted File Backend (Production)
```bash
# Set up encrypted secrets file
mkdir -p /etc/secrets
chmod 700 /etc/secrets

# Generate encryption key
openssl rand -base64 32 > /etc/secrets/encryption.key
chmod 600 /etc/secrets/encryption.key

# Set environment variables
export SECRETS_FILE="/etc/secrets/production-outsourcing.enc"
export SECRETS_ENCRYPTION_KEY="$(cat /etc/secrets/encryption.key)"
```

#### HashiCorp Vault (Enterprise)
```bash
# Install Vault client
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Configure Vault
export VAULT_URL="https://vault.your-company.com"
export VAULT_TOKEN="your_vault_token"
```

### 2.4 Secret Rotation

```bash
# Manual secret rotation via API
curl -X POST https://api.production-outsourcing.com/api/v1/security/secrets/rotate/sendgrid_api_key \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Automated rotation (cron job)
# Add to crontab: 0 2 1 * * /path/to/rotate_secrets.sh
```

### 2.5 Secrets Validation

```bash
# Check secrets status
curl -X GET https://api.production-outsourcing.com/api/v1/security/secrets/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 3. Security Audit and Penetration Testing

### 3.1 Running Security Audits

#### Manual Audit
```bash
# Run comprehensive security audit
python3 backend/app/core/security_audit.py https://api.production-outsourcing.com

# Via API
curl -X POST https://api.production-outsourcing.com/api/v1/security/audit/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_url": "https://api.production-outsourcing.com"}'
```

#### Automated Audits
```bash
# Schedule daily audits (cron)
# Add to crontab: 0 3 * * * /path/to/security_audit.sh

# Create audit script
cat > /opt/security/audit.sh << 'EOF'
#!/bin/bash
cd /opt/production-outsourcing
python3 backend/scripts/security_setup.py --audit-only
EOF
chmod +x /opt/security/audit.sh
```

### 3.2 Audit Categories

1. **Authentication Security**
   - Brute force protection
   - Password policy enforcement
   - Session management
   - JWT vulnerabilities

2. **Authorization Testing**
   - Vertical privilege escalation
   - Horizontal privilege escalation
   - Insecure direct object references
   - Function-level access control

3. **Input Validation**
   - SQL injection
   - Cross-site scripting (XSS)
   - Command injection
   - File upload vulnerabilities

4. **Security Headers**
   - HSTS implementation
   - Content Security Policy
   - Frame options
   - Content type options

5. **SSL/TLS Configuration**
   - Protocol versions
   - Cipher strength
   - Certificate validation

### 3.3 Penetration Testing

#### Scheduling Tests
```bash
# Schedule penetration test via API
curl -X POST https://api.production-outsourcing.com/api/v1/security/penetration-test/schedule \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": "https://api.production-outsourcing.com",
    "type": "comprehensive",
    "scheduled_time": "2024-12-27T02:00:00Z"
  }'
```

#### External Tools Integration
```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://api.production-outsourcing.com \
  -r zap-report.html

# Nmap vulnerability scan
nmap --script vuln api.production-outsourcing.com

# Nikto web scanner
nikto -h https://api.production-outsourcing.com
```

## 4. Security Hardening

### 4.1 Application Hardening

#### Security Headers
```python
# Add to FastAPI middleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["production-outsourcing.com", "*.production-outsourcing.com"])
```

#### Rate Limiting
```python
# Configure rate limiting
RATE_LIMIT_AUTH_REQUESTS = 5      # per minute
RATE_LIMIT_API_REQUESTS = 100     # per minute
RATE_LIMIT_PUBLIC_REQUESTS = 1000 # per hour
```

### 4.2 System Hardening

#### Firewall Configuration
```bash
# UFW firewall setup
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

#### System Security
```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups

# Secure SSH
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# File permissions
sudo chmod 640 /etc/shadow
sudo chmod 644 /etc/passwd
```

### 4.3 Database Security

```sql
-- Create dedicated application user
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON production_outsourcing.* TO 'app_user'@'localhost';

-- Remove default users
DROP USER ''@'localhost';
DROP USER ''@'%';

-- Enable SSL connections
GRANT USAGE ON *.* TO 'app_user'@'localhost' REQUIRE SSL;
```

## 5. Monitoring and Alerting

### 5.1 Security Monitoring

```bash
# Monitor failed login attempts
tail -f /var/log/auth.log | grep "Failed password"

# Monitor SSL certificate expiry
*/10 * * * * /opt/scripts/check_ssl_expiry.sh

# Monitor security audit results
*/5 * * * * /opt/scripts/security_alerts.sh
```

### 5.2 Automated Alerts

```python
# Security alert configuration
SECURITY_ALERTS = {
    'ssl_expiry_days': 30,
    'failed_auth_threshold': 10,
    'critical_vulnerabilities': True,
    'unauthorized_access_attempts': True
}
```

## 6. Compliance and Documentation

### 6.1 Security Compliance

- **GDPR**: Data encryption, access controls, audit logging
- **SOC 2**: Access management, encryption, monitoring
- **ISO 27001**: Security management system
- **OWASP Top 10**: Web application security

### 6.2 Security Documentation

- Security policies and procedures
- Incident response plan
- Data classification and handling
- Access control matrix
- Regular security training

## 7. Deployment Steps

### 7.1 Pre-deployment Checklist

- [ ] SSL certificates obtained and installed
- [ ] Secrets properly configured and encrypted
- [ ] Security hardening applied
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up
- [ ] Security audit completed
- [ ] Backup and recovery tested

### 7.2 Deployment Commands

```bash
# 1. Run security setup
python3 backend/scripts/security_setup.py --environment production --domain production-outsourcing.com

# 2. Configure Nginx
sudo cp config/nginx_ssl.conf /etc/nginx/sites-available/production-outsourcing
sudo ln -s /etc/nginx/sites-available/production-outsourcing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. Start application with SSL
uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile /etc/ssl/private/production-outsourcing/api.production-outsourcing.com.key --ssl-certfile /etc/ssl/certs/production-outsourcing/api.production-outsourcing.com.crt

# 4. Verify deployment
curl -I https://api.production-outsourcing.com/health
```

### 7.3 Post-deployment Verification

```bash
# SSL/TLS verification
curl -I https://api.production-outsourcing.com
openssl s_client -connect api.production-outsourcing.com:443 -servername api.production-outsourcing.com

# Security audit
curl -X POST https://api.production-outsourcing.com/api/v1/security/audit/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Compliance check
curl -X GET https://api.production-outsourcing.com/api/v1/security/compliance/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 8. Troubleshooting

### 8.1 Common SSL Issues

```bash
# Certificate not found
ls -la /etc/ssl/certs/production-outsourcing/

# Permission issues
sudo chown -R www-data:www-data /etc/ssl/certs/production-outsourcing/
sudo chmod 644 /etc/ssl/certs/production-outsourcing/*.crt
sudo chmod 600 /etc/ssl/private/production-outsourcing/*.key

# Certificate validation errors
openssl verify -CAfile /etc/ssl/ca/ca-bundle.crt /etc/ssl/certs/production-outsourcing/api.production-outsourcing.com.crt
```

### 8.2 Secrets Management Issues

```bash
# Encryption key issues
echo $SECRETS_ENCRYPTION_KEY
ls -la /etc/secrets/

# Permission problems
sudo chmod 700 /etc/secrets
sudo chmod 600 /etc/secrets/*

# Backend connection issues
python3 -c "from app.core.secrets import secrets_manager; print(secrets_manager.primary_backend)"
```

### 8.3 Security Audit Issues

```bash
# Network connectivity
curl -v https://api.production-outsourcing.com

# Authentication problems
curl -X GET https://api.production-outsourcing.com/api/v1/security/ssl/status \
  -H "Authorization: Bearer YOUR_TOKEN" -v

# Log analysis
tail -f logs/security_audit.log
```

## 9. Maintenance and Updates

### 9.1 Regular Maintenance Tasks

- Weekly security audits
- Monthly secret rotation (non-critical)
- Quarterly penetration testing
- Annual security policy review

### 9.2 Update Procedures

```bash
# Update SSL certificates (Let's Encrypt)
sudo certbot renew --dry-run
sudo certbot renew

# Update security dependencies
pip install --upgrade cryptography pyopenssl

# Update security configuration
git pull origin main
python3 backend/scripts/security_setup.py --environment production
```

This comprehensive security implementation provides a solid foundation for the Production Outsourcing Platform's security infrastructure, ensuring data protection, secure communications, and regulatory compliance. 