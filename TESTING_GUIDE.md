# Manufacturing Platform - Full User Flow Testing Guide

## Overview
This guide provides step-by-step instructions for testing the complete manufacturing platform from both client and production perspectives.

## Prerequisites

### 1. Backend Setup
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
The backend should be running on `http://localhost:8000`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
The frontend should be running on `http://localhost:3000`

### 3. Test Dependencies
```bash
pip install requests
```

## Manual Testing Steps

### Step 1: Infrastructure Testing
**Objective**: Verify backend services are operational

**Tests to perform**:
1. Health Check: `GET http://localhost:8000/health`
2. Root Endpoint: `GET http://localhost:8000/`
3. API Documentation: `GET http://localhost:8000/docs`

**Expected Results**:
- Health check returns status "healthy"
- Root endpoint provides API information
- Documentation is accessible (if debug mode enabled)

### Step 2: User Registration Testing
**Objective**: Test user registration for different roles

**Test Users**:
```json
{
  "client": {
    "email": "test-client@example.com",
    "password": "TestPassword123!",
    "full_name": "Test Client User",
    "role": "client"
  },
  "manufacturer": {
    "email": "test-manufacturer@example.com",
    "password": "TestPassword123!",
    "full_name": "Test Manufacturer User",
    "role": "manufacturer",
    "company_name": "Test Manufacturing Co."
  }
}
```

**API Endpoint**: `POST /api/v1/auth/register`

**Expected Results**:
- New users register successfully
- Existing users return appropriate error message
- User data is stored correctly

### Step 3: Authentication Testing
**Objective**: Test user login and token generation

**API Endpoint**: `POST /api/v1/auth/login`

**Test Data**:
```json
{
  "username": "test-client@example.com",
  "password": "TestPassword123!"
}
```

**Expected Results**:
- Valid credentials return access token
- Invalid credentials return error
- Tokens are properly formatted JWT

### Step 4: Client User Workflow
**Objective**: Test complete client user journey

**4.1 Profile Management**
- Endpoint: `GET /api/v1/users/me`
- Expected: User profile data returned

**4.2 Dashboard Access**
- Endpoint: `GET /api/v1/dashboard/`
- Expected: Dashboard metrics and overview

**4.3 Order Creation**
- Endpoint: `POST /api/v1/orders/`
- Test Data:
```json
{
  "title": "Test Manufacturing Order",
  "description": "Test order for user flow validation",
  "quantity": 100,
  "budget_min": 1000,
  "budget_max": 5000,
  "delivery_date": "2024-07-15T00:00:00Z",
  "specifications": {
    "material": "Steel",
    "dimensions": "10x10x10 cm",
    "tolerance": "±0.1mm"
  }
}
```

**4.4 Order Management**
- Endpoint: `GET /api/v1/orders/`
- Expected: List of client's orders

**4.5 Intelligent Matching**
- Endpoint: `GET /api/v1/matching/orders/{order_id}`
- Expected: Matching manufacturer recommendations

### Step 5: Manufacturer User Workflow
**Objective**: Test complete manufacturer user journey

**5.1 Profile Management**
- Endpoint: `GET /api/v1/users/me`
- Expected: Manufacturer profile data

**5.2 Dashboard Access**
- Endpoint: `GET /api/v1/dashboard/`
- Expected: Manufacturer dashboard metrics

**5.3 Order Discovery**
- Endpoint: `GET /api/v1/orders/`
- Expected: Available orders for quoting

**5.4 Quote Creation**
- Endpoint: `POST /api/v1/quotes/`
- Test Data:
```json
{
  "order_id": "{order_id}",
  "price": 3000.00,
  "delivery_time_days": 21,
  "description": "Professional manufacturing quote",
  "terms_conditions": "Standard manufacturing terms",
  "validity_days": 30
}
```

**5.5 Quote Management**
- Endpoint: `GET /api/v1/quotes/`
- Expected: List of manufacturer's quotes

### Step 6: Admin User Workflow
**Objective**: Test admin functionality

**Prerequisites**: Admin user must exist in database

**6.1 Admin Authentication**
- Use admin credentials: `admin@example.com` / `AdminPassword123!`

**6.2 System Overview**
- Profile: `GET /api/v1/users/me`
- Dashboard: `GET /api/v1/dashboard/`

**6.3 System Management**
- All Orders: `GET /api/v1/orders/`
- All Quotes: `GET /api/v1/quotes/`
- Performance Metrics: `GET /api/v1/performance/metrics`

## Automated Testing

### Run Automated Test Suite
```bash
python simple_test_flow.py
```

This script will automatically:
1. Test infrastructure
2. Register test users
3. Authenticate users
4. Run client workflow
5. Run manufacturer workflow
6. Run admin workflow
7. Generate summary report

### Frontend Testing

#### 1. Manual UI Testing
1. Navigate to `http://localhost:3000`
2. Test registration form
3. Test login form
4. Navigate through dashboards
5. Test order creation
6. Test quote creation

#### 2. Component Testing
```bash
cd frontend
npm test
```

#### 3. End-to-End Testing
```bash
cd frontend
npm run test:e2e
```

## Production Testing Checklist

### Security Testing
- [ ] Rate limiting works correctly
- [ ] Authentication required for protected endpoints
- [ ] Password complexity enforced
- [ ] SQL injection protection
- [ ] XSS protection

### Performance Testing
- [ ] Response times under 2 seconds
- [ ] Concurrent user handling
- [ ] Database query optimization
- [ ] Memory usage acceptable

### Integration Testing
- [ ] Database connectivity
- [ ] Email system functionality
- [ ] File upload/download
- [ ] Payment system integration

### User Experience Testing
- [ ] Intuitive navigation
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] Form validation

## Common Issues and Solutions

### Backend Issues
- **Connection refused**: Ensure backend is running on port 8000
- **Database errors**: Check database connection and migrations
- **Authentication failures**: Verify JWT secret configuration

### Frontend Issues
- **Component import errors**: Check Button component is properly created
- **Build failures**: Verify all dependencies are installed
- **API connection**: Ensure backend URL is correctly configured

### Testing Issues
- **Unicode errors**: Use Windows-compatible test scripts
- **Timeout errors**: Increase request timeout values
- **Permission errors**: Ensure proper user roles and tokens

## Success Criteria

### Minimum Requirements (Production Ready)
- [ ] 80%+ test pass rate
- [ ] All critical user flows working
- [ ] Security measures in place
- [ ] Performance benchmarks met

### Excellent Status
- [ ] 95%+ test pass rate
- [ ] All advanced features working
- [ ] Comprehensive error handling
- [ ] Optimal performance

## Reporting Issues

When reporting issues, include:
1. Test step where issue occurred
2. Expected vs actual behavior
3. Error messages or logs
4. Environment details (OS, browser, etc.)
5. Steps to reproduce

## Continuous Integration

For automated testing in CI/CD:
```yaml
# .github/workflows/test.yml
name: Full User Flow Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: pip install -r backend/requirements.txt
      - name: Start backend
        run: cd backend && python main.py &
      - name: Run tests
        run: python simple_test_flow.py
``` 