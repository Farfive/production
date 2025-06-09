@echo off
echo.
echo ============================================================
echo Manufacturing Platform API - User Scenario Testing
echo ============================================================
echo.

set BASE_URL=http://localhost:8000
set API_URL=%BASE_URL%/api/v1

echo [1/10] Testing API Health...
curl -s -w "Response Code: %%{http_code}\n" %BASE_URL%/health
echo.

echo [2/10] Testing Performance Health...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/performance/health
echo.

echo [3/10] Testing User Registration...
set USER_DATA={"email":"testclient_%RANDOM%@automotive.pl","password":"SecurePass123!","first_name":"Jan","last_name":"Kowalski","company_name":"AutoParts Sp. z o.o.","nip":"1234567890","phone":"+48221234567","company_address":"ul. Przemyslowa 15, Warszawa","role":"client","data_processing_consent":true,"marketing_consent":true}

curl -s -X POST -H "Content-Type: application/json" -d "%USER_DATA%" %API_URL%/auth/register
echo.

echo [4/10] Testing Performance Monitoring...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/performance/cache
echo.

echo [5/10] Testing Performance Summary...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/performance/summary?hours=1
echo.

echo [6/10] Testing Performance Budgets...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/performance/budgets
echo.

echo [7/10] Testing Email Unsubscribe (GDPR)...
set UNSUBSCRIBE_DATA={"email":"test@example.com","token":"test_token"}
curl -s -X POST -H "Content-Type: application/json" -d "%UNSUBSCRIBE_DATA%" %API_URL%/emails/unsubscribe
echo.

echo [8/10] Testing Error Handling - Invalid Endpoint...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/invalid-endpoint
echo.

echo [9/10] Testing Unauthorized Access...
curl -s -w "Response Code: %%{http_code}\n" %API_URL%/orders/
echo.

echo [10/10] Load Testing - 10 Health Checks...
for /L %%i in (1,1,10) do (
    curl -s %BASE_URL%/health > nul
    echo Health check %%i completed
)
echo.

echo ============================================================
echo User Scenario Testing Complete!
echo ============================================================
echo.
echo SUMMARY:
echo - Basic connectivity: Health endpoints tested
echo - Performance monitoring: Cache, summary, budgets tested
echo - Authentication: User registration tested
echo - Email system: GDPR unsubscribe tested
echo - Security: Error handling and authorization tested
echo - Load testing: Multiple concurrent requests tested
echo.
echo Check the output above for any error codes or issues.
echo A working API should return:
echo - 200 for successful operations
echo - 401 for unauthorized access (expected)
echo - 404 for invalid endpoints (expected)
echo - 422 for validation errors (expected)
echo.
pause 