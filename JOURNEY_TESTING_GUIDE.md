# 🚀 Manufacturing Platform - Journey Testing Guide

This guide explains how to test the three core user journeys in your B2B Manufacturing Platform individually.

## 📋 Available Journey Tests

### 1. 🎯 Client Journey Test
**Flow**: Register → Create Order → Receive Quotes → Compare → Accept → Pay

**File**: `test_client_journey.py`

**What it tests**:
- Client user registration and activation
- Client login with JWT authentication
- Order creation with specifications
- Quote retrieval and comparison
- Quote acceptance process
- Payment processing (test mode)

### 2. 🏭 Manufacturer Journey Test
**Flow**: Register → Browse Orders → Create Quotes → Negotiate → Fulfill

**File**: `test_manufacturer_journey.py`

**What it tests**:
- Manufacturer user registration and activation
- Manufacturer login with JWT authentication
- Manufacturer profile creation
- Browsing available orders
- Creating competitive quotes
- Handling quote negotiations
- Order fulfillment tracking

### 3. 👑 Admin Journey Test
**Flow**: Monitor → Manage Users → Analytics

**File**: `test_admin_journey.py`

**What it tests**:
- Admin user creation and authentication
- System health monitoring
- User management capabilities
- Platform analytics and reporting
- Configuration management
- Report generation

## 🚀 How to Run the Tests

### Option 1: Interactive Menu (Recommended)

1. **Start your backend server**:
   ```bash
   cd backend
   python -m uvicorn main:app --reload
   ```

2. **Run the interactive test menu**:
   ```bash
   python run_individual_journey_tests.py
   ```
   
   Or on Windows, double-click:
   ```
   run_journey_tests.bat
   ```

3. **Choose your test**:
   - Enter `1` for Client Journey
   - Enter `2` for Manufacturer Journey  
   - Enter `3` for Admin Journey
   - Enter `4` to run all tests sequentially
   - Enter `0` to exit

### Option 2: Run Individual Tests Directly

**Client Journey**:
```bash
python test_client_journey.py
```

**Manufacturer Journey**:
```bash
python test_manufacturer_journey.py
```

**Admin Journey**:
```bash
python test_admin_journey.py
```

## 📊 Understanding Test Results

### ✅ Success Indicators
- **PASSED**: Step completed successfully
- Green checkmarks and positive messages
- Core functionality verified

### ❌ Failure Indicators
- **FAILED**: Step encountered an error
- **ERROR**: Unexpected exception occurred
- Red X marks and error messages

### ⚠️ Warning Indicators
- **Expected limitations**: Some features may not be fully implemented
- **Test mode**: Payment processing in test mode
- **Missing data**: No quotes/orders available for testing

## 🔧 Prerequisites

### Backend Requirements
1. **Backend server running** on `http://localhost:8000`
2. **Database initialized** with proper tables
3. **All dependencies installed** in the backend environment

### Python Dependencies
The tests require these Python packages:
- `requests` - For API calls
- `sqlite3` - For database operations (built-in)
- `datetime` - For timestamp handling (built-in)

Install if needed:
```bash
pip install requests
```

## 🎯 Test Scenarios Explained

### Client Journey Details
1. **Health Check**: Verifies backend is running
2. **Registration**: Creates new client account
3. **Activation**: Automatically activates user account
4. **Login**: Authenticates and receives JWT token
5. **Order Creation**: Creates a test manufacturing order
6. **Quote Waiting**: Checks for manufacturer quotes (15 seconds)
7. **Quote Comparison**: Analyzes available quotes
8. **Quote Acceptance**: Accepts the best quote
9. **Payment**: Processes payment (test mode)

### Manufacturer Journey Details
1. **Health Check**: Verifies backend is running
2. **Registration**: Creates new manufacturer account
3. **Activation**: Automatically activates user account
4. **Login**: Authenticates and receives JWT token
5. **Profile Creation**: Sets up manufacturer capabilities
6. **Order Browsing**: Views available client orders
7. **Quote Creation**: Creates competitive quote
8. **Negotiation**: Handles quote negotiations
9. **Fulfillment**: Updates order fulfillment status

### Admin Journey Details
1. **Health Check**: Verifies backend is running
2. **Admin Setup**: Creates admin user and authenticates
3. **System Monitoring**: Checks system metrics and health
4. **User Management**: Views and manages platform users
5. **Analytics**: Generates platform analytics
6. **Settings**: Manages platform configuration
7. **Reports**: Creates activity and usage reports

## 🛠️ Troubleshooting

### Common Issues

**Backend Connection Failed**
```
❌ Backend connection failed: Connection refused
```
**Solution**: Make sure backend is running on port 8000

**User Activation Issues**
```
❌ Order creation failed: Inactive user account
```
**Solution**: Tests automatically activate users, but check database permissions

**Database Errors**
```
❌ Error activating user: database is locked
```
**Solution**: Ensure no other processes are using the database

**Import Errors**
```
ModuleNotFoundError: No module named 'werkzeug'
```
**Solution**: Install missing dependencies in your backend environment

### Debug Mode

To see more detailed output, you can modify the test files to include debug information:

1. Open any test file (e.g., `test_client_journey.py`)
2. Add debug prints in the methods you want to investigate
3. Check the response content for API errors

### Manual Database Check

If tests fail, you can manually check the database:

```python
import sqlite3
conn = sqlite3.connect('manufacturing_platform.db')
cursor = conn.cursor()

# Check users
cursor.execute("SELECT id, email, role, is_active FROM users ORDER BY created_at DESC LIMIT 5")
print(cursor.fetchall())

# Check orders
cursor.execute("SELECT id, title, created_at FROM orders ORDER BY created_at DESC LIMIT 5")
print(cursor.fetchall())

conn.close()
```

## 📈 Expected Results

### Successful Test Run
- **Client Journey**: 6-8 steps should pass
- **Manufacturer Journey**: 6-8 steps should pass  
- **Admin Journey**: 5-7 steps should pass

### Partial Success (Normal)
Some advanced features may not be fully implemented:
- Quote negotiations
- Payment processing
- Advanced analytics
- Fulfillment tracking

This is normal for development/testing environments.

## 🔄 Running Tests Repeatedly

The tests are designed to be run multiple times:
- Each test creates unique users with timestamps
- Database entries accumulate (this is normal)
- Tests don't interfere with each other

To clean up test data periodically:
```sql
DELETE FROM users WHERE email LIKE '%_journey_%@example.com';
DELETE FROM orders WHERE title LIKE '%Journey Test%';
DELETE FROM quotes WHERE notes LIKE '%test%';
```

## 📞 Support

If you encounter issues:
1. Check that backend is running and healthy
2. Verify database permissions
3. Review the error messages in test output
4. Check backend logs for API errors
5. Ensure all dependencies are installed

The tests provide detailed feedback to help identify and resolve issues quickly. 