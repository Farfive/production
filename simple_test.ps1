# Simple API Test Script
Write-Host "🚀 Manufacturing Platform API - Quick Test" -ForegroundColor Green
Write-Host "=" * 50

$baseUrl = "http://localhost:8000"
$apiUrl = "$baseUrl/api/v1"

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Health Check: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
    $healthData = $response.Content | ConvertFrom-Json
    Write-Host "   Service: $($healthData.service)"
    Write-Host "   Status: $($healthData.status)"
} catch {
    Write-Host "❌ Health Check: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Performance Health
Write-Host "`n2. Testing Performance Health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/performance/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Performance Health: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Performance Health: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Performance Cache
Write-Host "`n3. Testing Performance Cache..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/performance/cache" -Method Get -TimeoutSec 5
    Write-Host "✅ Performance Cache: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Performance Cache: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User Registration
Write-Host "`n4. Testing User Registration..." -ForegroundColor Yellow
$userData = @{
    email = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "TestPassword123!"
    first_name = "John"
    last_name = "Doe"
    company_name = "Test Company"
    nip = "1234567890"
    phone = "+48123456789"
    company_address = "Test Address"
    role = "client"
    data_processing_consent = $true
    marketing_consent = $false
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$apiUrl/auth/register" -Method Post -Body $userData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ User Registration: SUCCESS (Status: $($response.StatusCode))" -ForegroundColor Green
    $user = $response.Content | ConvertFrom-Json
    Write-Host "   User ID: $($user.id)"
    Write-Host "   Email: $($user.email)"
    
    # Test 5: User Login
    Write-Host "`n5. Testing User Login..." -ForegroundColor Yellow
    $loginData = "username=$($user.email)&password=TestPassword123!"
    try {
        $loginResponse = Invoke-WebRequest -Uri "$apiUrl/auth/login" -Method Post -Body $loginData -ContentType "application/x-www-form-urlencoded" -TimeoutSec 10
        Write-Host "✅ User Login: SUCCESS (Status: $($loginResponse.StatusCode))" -ForegroundColor Green
        $tokenData = $loginResponse.Content | ConvertFrom-Json
        $token = $tokenData.access_token
        Write-Host "   Token Type: $($tokenData.token_type)"
        
        # Test 6: Get Current User
        Write-Host "`n6. Testing Get Current User..." -ForegroundColor Yellow
        $headers = @{ Authorization = "Bearer $token" }
        try {
            $userResponse = Invoke-WebRequest -Uri "$apiUrl/auth/me" -Method Get -Headers $headers -TimeoutSec 5
            Write-Host "✅ Get Current User: SUCCESS (Status: $($userResponse.StatusCode))" -ForegroundColor Green
            $currentUser = $userResponse.Content | ConvertFrom-Json
            Write-Host "   User: $($currentUser.email)"
            Write-Host "   Role: $($currentUser.role)"
        } catch {
            Write-Host "❌ Get Current User: FAILED - $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ User Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ User Registration: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Error Handling
Write-Host "`n7. Testing Error Handling..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/nonexistent" -Method Get -TimeoutSec 5
    Write-Host "❌ Error Handling: FAILED - Should return 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "✅ Error Handling: SUCCESS - 404 correctly returned" -ForegroundColor Green
    } else {
        Write-Host "❌ Error Handling: FAILED - Unexpected error" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 50
Write-Host "🏁 Quick API Test Complete!" -ForegroundColor Green 