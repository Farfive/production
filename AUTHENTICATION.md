# Production-Ready Authentication System

## Overview

This manufacturing platform implements a secure, production-ready authentication system with JWT tokens, role-based access control, and comprehensive security features.

## Features

### 🔐 Security Features
- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt with 12 rounds
- **Password Strength Validation** with complexity requirements
- **Role-Based Access Control** (RBAC) for Client, Manufacturer, and Admin roles
- **Email Verification** for account activation
- **Password Reset** with secure token-based flow
- **Token Expiration** (15 minutes for access, 7 days for refresh)
- **Secure Token Storage** with automatic refresh

### 👥 User Roles
- **Client**: Can create orders, request quotes, manage payments
- **Manufacturer**: Can respond to quotes, manage production, view analytics
- **Admin**: Full system access, user management, platform administration

## Authentication Flow

### 1. User Registration
```
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "client",
  "phone": "+1234567890",
  "data_processing_consent": true,
  "marketing_consent": false
}
```

**For Manufacturers (additional fields):**
```json
{
  "company_name": "Manufacturing Co",
  "nip": "1234567890",
  "company_address": "123 Industrial St, City, Country"
}
```

### 2. Email Verification
After registration, users receive an email verification link:
```
GET /verify-email?token=<verification_token>
```

### 3. User Login
```
POST /api/v1/auth/login-json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client",
    "isVerified": true
  }
}
```

### 4. Token Refresh
```
POST /api/v1/auth/refresh
Authorization: Bearer <refresh_token>
```

### 5. Password Reset
```
POST /api/v1/auth/password-reset-request
{
  "email": "user@example.com"
}
```

```
POST /api/v1/auth/password-reset
{
  "token": "<reset_token>",
  "new_password": "NewSecurePassword123!"
}
```

## Frontend Authentication

### useAuth Hook
The `useAuth` hook provides authentication state and actions:

```typescript
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    login, 
    logout, 
    register 
  } = useAuth();

  // Component logic
}
```

### Protected Routes
```typescript
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { UserRole } from '../types';

<ProtectedRoute requiredRole={UserRole.ADMIN}>
  <AdminDashboard />
</ProtectedRoute>
```

### Role-Based Hooks
```typescript
import { useIsAdmin, useIsClient, useIsManufacturer } from '../hooks/useAuth';

function MyComponent() {
  const isAdmin = useIsAdmin();
  const isClient = useIsClient();
  const isManufacturer = useIsManufacturer();
}
```

## Password Requirements

### Strength Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*(),.?":{}|<>)
- Cannot be a common password

### Examples
✅ **Valid passwords:**
- `SecurePass123!`
- `MyStr0ng@Password`
- `Manufact2024#`

❌ **Invalid passwords:**
- `password` (too common)
- `12345678` (no letters or special chars)
- `Password` (no digits or special chars)
- `pass123!` (too short)

## Admin User Creation

### Production Setup
For production environments, admin users must be created manually using the secure script:

```bash
cd backend
python create_admin_user.py
```

This script:
- Requires manual confirmation
- Validates password strength
- Uses secure password input (hidden)
- Creates admin with full privileges

### Development Setup
For development, you can create test users through the registration endpoint with role='admin'.

## Security Best Practices

### Token Management
- **Access tokens** expire in 15 minutes
- **Refresh tokens** expire in 7 days
- Tokens are automatically refreshed on API calls
- Tokens are cleared on logout

### Password Security
- Passwords are hashed using bcrypt with 12 rounds
- Plain text passwords are never stored
- Password reset tokens expire in 1 hour
- Email verification tokens expire in 24 hours

### API Security
- All authenticated endpoints require valid JWT tokens
- Role-based access control prevents unauthorized access
- Failed login attempts are logged
- Sensitive operations require additional verification

## Environment Configuration

### Required Environment Variables
```bash
# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Database
DATABASE_URL=sqlite:///./manufacturing_platform.db

# Email (for verification and password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend Configuration
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_ENVIRONMENT=production

# Feature Flags
REACT_APP_USE_MOCK_AUTH=false  # Always false for production
```

## API Endpoints

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (form data)
- `POST /auth/login-json` - User login (JSON)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user profile

### Password Management
- `POST /auth/password-reset-request` - Request password reset
- `POST /auth/password-reset` - Reset password with token
- `POST /auth/change-password` - Change password (authenticated)

### Email Verification
- `POST /auth/verify-email` - Verify email with token
- `POST /auth/resend-verification` - Resend verification email

## Error Handling

### Common Error Responses
```json
{
  "detail": "Incorrect email or password",
  "status_code": 401
}
```

```json
{
  "detail": "Email already registered",
  "status_code": 400
}
```

```json
{
  "detail": "Admin access required",
  "status_code": 403
}
```

## Testing Authentication

### Manual Testing
1. Register a new user
2. Check email for verification link
3. Verify email address
4. Login with credentials
5. Access protected routes
6. Test token refresh
7. Test logout

### Automated Testing
```bash
# Backend tests
cd backend
pytest tests/test_auth.py

# Frontend tests
cd frontend
npm test -- auth
```

## Troubleshooting

### Common Issues

**"Invalid authentication credentials"**
- Check if JWT_SECRET_KEY is set correctly
- Verify token hasn't expired
- Ensure token is sent in Authorization header

**"Email already registered"**
- User already exists in database
- Use different email or login instead

**"Password does not meet requirements"**
- Check password complexity requirements
- Ensure minimum 8 characters with mixed case, digits, and special chars

**"User not found"**
- Email may not be registered
- Check for typos in email address

### Logs
Authentication events are logged with appropriate levels:
- INFO: Successful logins, registrations
- WARNING: Failed login attempts, invalid tokens
- ERROR: System errors, security violations

## Migration from Development

### Removing Development Features
1. ✅ Mock authentication disabled
2. ✅ Auto-admin creation removed
3. ✅ Debug endpoints removed
4. ✅ Production-ready password validation
5. ✅ Secure token management

### Production Checklist
- [ ] Set strong JWT_SECRET_KEY
- [ ] Configure email service
- [ ] Set up HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Create admin users manually
- [ ] Test all authentication flows
- [ ] Verify role-based access control

## Support

For authentication-related issues:
1. Check the logs for error details
2. Verify environment configuration
3. Test with a fresh user registration
4. Contact system administrator for admin access issues 