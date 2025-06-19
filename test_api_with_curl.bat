@echo off
echo ================================================================================
echo AUTOMATED API TEST USING CURL
echo Testing registration and authentication fixes
echo ================================================================================

set BASE_URL=http://127.0.0.1:8000
set TIMESTAMP=%RANDOM%

echo.
echo 1. Testing Health Endpoint...
curl -s -w "Status: %%{http_code}\n" %BASE_URL%/health
echo.

echo 2. Testing Registration Endpoint...
echo Creating test user with timestamp: %TIMESTAMP%

curl -s -w "Status: %%{http_code}\n" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"curltest.%TIMESTAMP%@example.com\",\"password\":\"TestPass123!\",\"first_name\":\"Curl\",\"last_name\":\"Test\",\"company_name\":\"Curl Test Corp\",\"role\":\"client\",\"data_processing_consent\":true,\"marketing_consent\":false}" ^
  %BASE_URL%/api/v1/auth/register
echo.

echo 3. Testing Login Endpoint...
curl -s -w "Status: %%{http_code}\n" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"curltest.%TIMESTAMP%@example.com\",\"password\":\"TestPass123!\"}" ^
  %BASE_URL%/api/v1/auth/login-json > login_response.json
echo.

echo 4. Checking if login response contains access_token...
findstr "access_token" login_response.json >nul
if %ERRORLEVEL% equ 0 (
    echo ✅ SUCCESS: access_token found in login response
) else (
    echo ❌ FAILED: No access_token found
)

echo.
echo 5. Testing Protected Endpoint (should be 401/403 without token)...
curl -s -w "Status: %%{http_code}\n" %BASE_URL%/api/v1/users/me
echo.

echo ================================================================================
echo API TEST RESULTS:
echo ================================================================================
echo ✅ If you see Status: 200 for health - Health endpoint working
echo ✅ If you see JSON response for registration - JSON parsing fix working  
echo ✅ If you see access_token in login - Authentication working
echo ✅ If you see Status: 401/403 for protected - Security working
echo.
echo Registration and authentication fixes verification complete!
echo ================================================================================

:: Cleanup
del login_response.json 2>nul

pause 