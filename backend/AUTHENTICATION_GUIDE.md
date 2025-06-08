# Manufacturing Platform Authentication System

## Overview

The Manufacturing Platform implements a comprehensive, production-ready authentication system with JWT tokens, role-based access control, email verification, password reset, and GDPR compliance features.

## Security Features

### 🔐 JWT Authentication
- **Access Tokens**: 15-minute expiry for security
- **Refresh Tokens**: 7-day expiry with rotation support
- **Token Types**: Separate token types for different purposes (access, refresh, email verification, password reset)
- **Secure Storage**: Tokens include cryptographically secure random IDs for revocation

### 🛡️ Password Security
- **Bcrypt Hashing**: 12 rounds minimum for production security
- **Password Complexity**: Enforced requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one digit
  - At least one special character
  - No common passwords

### 🚫 Rate Limiting
- **Auth Endpoints**: 5 requests per minute
- **API Endpoints**: 100 requests per minute
- **Public Endpoints**: 1000 requests per hour
- **Sliding Window**: Advanced algorithm with proper cleanup

### 🌐 CORS & Security Headers
- **Production CORS**: Strict origin validation
- **Security Headers**: XSS protection, content sniffing prevention, frame protection
- **CSP**: Content Security Policy implementation
- **HSTS**: HTTP Strict Transport Security for HTTPS

### 🔍 Input Validation
- **Pydantic Models**: Comprehensive validation schemas
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization and output encoding
- **Data Type Validation**: Strict type checking

## User Management

### Registration Process
1. **User Data Validation**: Email, password strength, GDPR consent
2. **Duplicate Check**: Email and NIP uniqueness validation
3. **Account Creation**: Secure password hashing and user creation
4. **Email Verification**: Automated verification email with secure token
5. **Account Activation**: Status update upon email verification

### Login Process
1. **Credential Validation**: Email and password verification
2. **Account Status Check**: Active and verified account validation
3. **Token Generation**: Access and refresh token creation
4. **Login Tracking**: Last login timestamp update
5. **Security Logging**: Failed attempt tracking

### Password Reset Workflow
1. **Reset Request**: Email-based password reset initiation
2. **Token Generation**: Secure 1-hour expiry token
3. **Email Delivery**: Password reset email with secure link
4. **Password Update**: New password validation and update
5. **Token Cleanup**: Reset token invalidation

## RBAC (Role-Based Access Control)

### User Roles
- **CLIENT**: Can create orders, manage quotes, make payments
- **MANUFACTURER**: Can manage production capabilities, respond to quotes
- **ADMIN**: Full system access and user management

### Role Enforcement
```python
# Require specific role
@router.get("/admin/users")
async def get_users(current_user: User = Depends(require_admin())):
    pass

# Require multiple roles
@router.get("/orders")
async def get_orders(current_user: User = Depends(require_client_or_manufacturer())):
    pass
```

### Permission Matrix
| Endpoint | CLIENT | MANUFACTURER | ADMIN |
|----------|--------|--------------|-------|
| Create Order | ✅ | ❌ | ✅ |
| Respond to Quote | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| View Analytics | ❌ | ❌ | ✅ |

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "CLIENT",
  "company_name": "Example Corp",
  "nip": "1234567890",
  "phone": "+48123456789",
  "data_processing_consent": true,
  "marketing_consent": false
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "remember_me": false
}
```

#### Refresh Token
```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### Verify Email
```http
POST /api/v1/auth/verify-email
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### Password Reset Request
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "new_password": "NewSecurePassword123!"
}
```

### User Management Endpoints

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

#### Update Profile
```http
PUT /api/v1/auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "first_name": "John Updated",
  "company_name": "New Company Name",
  "marketing_consent": true
}
```

#### Change Password
```http
POST /api/v1/auth/change-password
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "current_password": "CurrentPassword123!",
  "new_password": "NewPassword123!"
}
```

## Error Handling

### Error Response Format
```json
{
  "error": true,
  "message": "Detailed error message",
  "status_code": 400,
  "error_code": "VALIDATION_ERROR",
  "details": {
    "errors": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter",
        "type": "value_error"
      }
    ]
  }
}
```

### Common Error Codes
- `INVALID_CREDENTIALS`: Invalid email or password
- `EMAIL_NOT_VERIFIED`: Account email not verified
- `ACCOUNT_SUSPENDED`: Account has been suspended
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `EMAIL_ALREADY_EXISTS`: Email already registered
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_TOKEN`: Token is invalid or expired

## GDPR Compliance

### Data Protection Features
- **Consent Tracking**: Explicit consent with timestamps
- **Data Export**: User data export functionality
- **Account Deletion**: GDPR-compliant account deletion
- **Data Retention**: Configurable retention periods
- **Audit Logging**: Comprehensive activity tracking

### GDPR Endpoints
```http
# Request data export
POST /api/v1/auth/gdpr/export-data
Authorization: Bearer token...
{
  "password": "UserPassword123!"
}

# Request account deletion
POST /api/v1/auth/gdpr/delete-account
Authorization: Bearer token...
{
  "password": "UserPassword123!",
  "confirmation": "DELETE"
}
```

## Security Best Practices

### Production Deployment
1. **Environment Variables**: Use secure secret management
2. **HTTPS Only**: Enable HSTS and secure cookies
3. **Database Security**: Use connection pooling and read replicas
4. **Monitoring**: Implement comprehensive logging and monitoring
5. **Backup Strategy**: Regular automated backups

### Token Management
- **Secure Storage**: Store tokens in httpOnly cookies or secure storage
- **Token Rotation**: Implement refresh token rotation
- **Blacklisting**: Maintain revoked token blacklist (Redis recommended)
- **Short Expiry**: Keep access tokens short-lived (15 minutes)

### Password Policy
- **Complexity Requirements**: Enforce strong password rules
- **Breach Detection**: Check against known breached passwords
- **Rate Limiting**: Limit password reset attempts
- **Account Lockout**: Implement account lockout after failed attempts

## Testing

### Test Coverage
- **Unit Tests**: Password validation, token management, security functions
- **Integration Tests**: Authentication flows, role enforcement
- **Security Tests**: Rate limiting, input validation, error handling
- **Performance Tests**: Load testing for authentication endpoints

### Running Tests
```bash
# Run all tests
pytest backend/tests/test_auth.py -v

# Run with coverage
pytest backend/tests/test_auth.py --cov=app.core.security --cov-report=html

# Run specific test categories
pytest backend/tests/test_auth.py::TestPasswordValidator -v
pytest backend/tests/test_auth.py::TestTokenManager -v
pytest backend/tests/test_auth.py::TestAuthEndpoints -v
```

## Performance Considerations

### Database Optimization
- **Indexes**: Email, NIP, and status fields are indexed
- **Connection Pooling**: Configured for production workloads
- **Query Optimization**: Efficient user lookup queries

### Caching Strategy
- **Redis Integration**: Rate limiting and session management
- **Token Blacklist**: Efficient revoked token storage
- **User Session**: Cache frequently accessed user data

### Monitoring Metrics
- **Authentication Rate**: Login/registration success rates
- **Token Usage**: Access/refresh token usage patterns
- **Error Rates**: Failed authentication attempts
- **Performance**: Response times for auth endpoints

## Configuration

### Environment Variables
```bash
# Security
SECRET_KEY=your-super-secret-key-min-32-chars
JWT_SECRET_KEY=your-jwt-secret-key-min-32-chars

# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# Email
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# Redis
REDIS_URL=redis://localhost:6379/0

# Rate Limiting
RATE_LIMIT_AUTH_REQUESTS=5
RATE_LIMIT_API_REQUESTS=100

# Features
ENABLE_EMAIL_VERIFICATION=true
ENABLE_TWO_FACTOR_AUTH=false
```

### Production Configuration
```python
# Production settings
class ProductionSettings(Settings):
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    CORS_ORIGINS: List[str] = ["https://your-domain.com"]
    ALLOWED_HOSTS: List[str] = ["your-domain.com", "api.your-domain.com"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
```

## Troubleshooting

### Common Issues

#### Token Validation Errors
- **Issue**: "Invalid token" errors
- **Solution**: Check token format, expiry, and secret key consistency

#### Email Verification Not Working
- **Issue**: Verification emails not received
- **Solution**: Check email service configuration and spam folders

#### Rate Limiting Issues
- **Issue**: Legitimate users being rate limited
- **Solution**: Adjust rate limits or implement user-specific limits

#### Password Reset Problems
- **Issue**: Reset tokens not working
- **Solution**: Check token expiry and email delivery

### Debug Mode
Enable debug logging for detailed troubleshooting:
```python
# Enable debug logging
LOG_LEVEL=DEBUG

# Check specific auth issues
logger.debug(f"Token verification failed: {token}")
logger.debug(f"Password validation errors: {errors}")
```

## Migration from Existing Systems

### Database Migration
1. **Schema Updates**: Run Alembic migrations
2. **Password Migration**: Rehash existing passwords
3. **Token Cleanup**: Invalidate old session tokens
4. **Data Validation**: Ensure GDPR compliance

### API Compatibility
- **Versioning**: Maintain API version compatibility
- **Gradual Migration**: Phase rollout of new auth system
- **Backward Compatibility**: Support legacy authentication temporarily

## Support

For technical support or questions about the authentication system:
- **Documentation**: Check this guide and API documentation
- **Issues**: Report bugs or security issues
- **Security**: Report security vulnerabilities responsibly

---

**Last Updated**: December 26, 2024  
**Version**: 1.0.0  
**Security Review**: ✅ Completed 