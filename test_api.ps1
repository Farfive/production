# Manufacturing Platform API Testing Script
Write-Host "🚀 Testing Manufacturing Platform API" -ForegroundColor Green
Write-Host "=" * 50

$baseUrl = "http://localhost:8000"
$apiUrl = "$baseUrl/api/v1"

# Test 1: Health Check
Write-Host "`n1. Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health Check: $($response.status)" -ForegroundColor Green
    Write-Host "   Service: $($response.service)"
    Write-Host "   Version: $($response.version)"
} catch {
    Write-Host "❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Performance Health
Write-Host "`n2. Testing Performance Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$apiUrl/performance/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Performance Health: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Performance Health Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: User Registration
Write-Host "`n3. Testing User Registration..." -ForegroundColor Yellow
$userData = @{
    email = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "SecurePassword123!"
    first_name = "John"
    last_name = "Doe"
    company_name = "Test Manufacturing Co."
    nip = "1234567890"
    phone = "+48123456789"
    company_address = "ul. Testowa 123, Warsaw"
    role = "client"
    data_processing_consent = $true
    marketing_consent = $false
} | ConvertTo-Json

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    $registerResponse = Invoke-RestMethod -Uri "$apiUrl/auth/register" -Method Post -Body $userData -Headers $headers -TimeoutSec 10
    Write-Host "✅ User Registration: Success" -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.id)"
    Write-Host "   Email: $($registerResponse.email)"
    
    # Test 4: User Login
    Write-Host "`n4. Testing User Login..." -ForegroundColor Yellow
    $loginData = "username=$($registerResponse.email)&password=SecurePassword123!"
    $loginHeaders = @{
        "Content-Type" = "application/x-www-form-urlencoded"
    }
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$apiUrl/auth/login" -Method Post -Body $loginData -Headers $loginHeaders -TimeoutSec 10
        Write-Host "✅ User Login: Success" -ForegroundColor Green
        Write-Host "   Token Type: $($loginResponse.token_type)"
        Write-Host "   Expires In: $($loginResponse.expires_in) seconds"
        
        # Test 5: Get Current User
        Write-Host "`n5. Testing Get Current User..." -ForegroundColor Yellow
        $authHeaders = @{
            "Authorization" = "Bearer $($loginResponse.access_token)"
        }
        
        try {
            $userResponse = Invoke-RestMethod -Uri "$apiUrl/auth/me" -Method Get -Headers $authHeaders -TimeoutSec 10
            Write-Host "✅ Get Current User: Success" -ForegroundColor Green
            Write-Host "   User: $($userResponse.email)"
            Write-Host "   Role: $($userResponse.role)"
            
            # Test 6: Create Order
            Write-Host "`n6. Testing Create Order..." -ForegroundColor Yellow
            $orderData = @{
                title = "Custom CNC Machined Components"
                description = "We need precision CNC machined aluminum components for automotive application. High quality requirements with tight tolerances."
                technology = "CNC Machining"
                material = "Aluminum 6061-T6"
                quantity = 100
                budget_pln = 25000.00
                delivery_deadline = (Get-Date).AddDays(45).ToString("yyyy-MM-ddTHH:mm:ss")
                priority = "high"
                preferred_location = "Warsaw, Poland"
                specifications = @{
                    dimensions = "150x75x30mm"
                    tolerance = "±0.05mm"
                    finish = "Anodized Type II"
                    material_certificate = "Required"
                    quality_standard = "ISO 9001"
                }
            } | ConvertTo-Json -Depth 3
            
            try {
                $orderResponse = Invoke-RestMethod -Uri "$apiUrl/orders/" -Method Post -Body $orderData -Headers ($authHeaders + @{"Content-Type" = "application/json"}) -TimeoutSec 10
                Write-Host "✅ Create Order: Success" -ForegroundColor Green
                Write-Host "   Order ID: $($orderResponse.id)"
                Write-Host "   Title: $($orderResponse.title)"
                Write-Host "   Status: $($orderResponse.status)"
                
                # Test 7: Get Orders
                Write-Host "`n7. Testing Get Orders..." -ForegroundColor Yellow
                try {
                    $ordersResponse = Invoke-RestMethod -Uri "$apiUrl/orders/" -Method Get -Headers $authHeaders -TimeoutSec 10
                    Write-Host "✅ Get Orders: Success" -ForegroundColor Green
                    Write-Host "   Orders Count: $($ordersResponse.orders.Count)"
                    Write-Host "   Total: $($ordersResponse.total)"
                } catch {
                    Write-Host "❌ Get Orders Failed: $($_.Exception.Message)" -ForegroundColor Red
                }
                
                # Test 8: Intelligent Matching
                Write-Host "`n8. Testing Intelligent Matching..." -ForegroundColor Yellow
                $matchingData = @{
                    order_id = $orderResponse.id
                    max_results = 5
                    enable_fallback = $true
                } | ConvertTo-Json
                
                try {
                    $matchingResponse = Invoke-RestMethod -Uri "$apiUrl/matching/find-matches" -Method Post -Body $matchingData -Headers ($authHeaders + @{"Content-Type" = "application/json"}) -TimeoutSec 10
                    Write-Host "✅ Intelligent Matching: Success" -ForegroundColor Green
                    Write-Host "   Matches Found: $($matchingResponse.matches_found)"
                    Write-Host "   Processing Time: $($matchingResponse.processing_time_seconds) seconds"
                } catch {
                    Write-Host "❌ Intelligent Matching Failed: $($_.Exception.Message)" -ForegroundColor Red
                }
                
            } catch {
                Write-Host "❌ Create Order Failed: $($_.Exception.Message)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "❌ Get Current User Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ User Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ User Registration Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Error Details: $($_.ErrorDetails.Message)"
}

# Test 9: Performance Monitoring
Write-Host "`n9. Testing Performance Monitoring..." -ForegroundColor Yellow

# Cache Performance
try {
    $cacheResponse = Invoke-RestMethod -Uri "$apiUrl/performance/cache" -Method Get -TimeoutSec 10
    Write-Host "✅ Cache Performance: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Cache Performance Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Performance Summary
try {
    $summaryResponse = Invoke-RestMethod -Uri "$apiUrl/performance/summary?hours=1" -Method Get -TimeoutSec 10
    Write-Host "✅ Performance Summary: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Performance Summary Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Performance Budgets
try {
    $budgetsResponse = Invoke-RestMethod -Uri "$apiUrl/performance/budgets" -Method Get -TimeoutSec 10
    Write-Host "✅ Performance Budgets: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Performance Budgets Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Error Handling
Write-Host "`n10. Testing Error Handling..." -ForegroundColor Yellow

# Invalid Endpoint
try {
    Invoke-RestMethod -Uri "$apiUrl/invalid-endpoint" -Method Get -TimeoutSec 10
    Write-Host "❌ Invalid Endpoint: Should have returned 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq "NotFound") {
        Write-Host "✅ Invalid Endpoint: Correctly returned 404" -ForegroundColor Green
    } else {
        Write-Host "❌ Invalid Endpoint: Unexpected error $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Unauthorized Access
try {
    Invoke-RestMethod -Uri "$apiUrl/orders/" -Method Get -TimeoutSec 10
    Write-Host "❌ Unauthorized Access: Should have returned 401" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq "Unauthorized") {
        Write-Host "✅ Unauthorized Access: Correctly returned 401" -ForegroundColor Green
    } else {
        Write-Host "❌ Unauthorized Access: Unexpected error $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 50
Write-Host "🏁 API Testing Complete!" -ForegroundColor Green
Write-Host "Check the results above for any issues that need attention." -ForegroundColor Yellow 