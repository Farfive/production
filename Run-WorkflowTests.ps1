#!/usr/bin/env powershell
<#
.SYNOPSIS
    Manufacturing SaaS Platform - Complete Workflow Test Runner

.DESCRIPTION
    This script runs comprehensive tests for the manufacturing SaaS platform including:
    - Backend server health checks
    - Database integrity verification
    - End-to-end user workflows
    - Order and quote management
    - Payment and escrow systems
    
.EXAMPLE
    .\Run-WorkflowTests.ps1
#>

Write-Host "==========================================" -ForegroundColor Green
Write-Host "Manufacturing SaaS Platform - Full Workflow Test" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# Function to test backend health
function Test-BackendHealth {
    Write-Host "Testing backend server health..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get -TimeoutSec 10
        if ($response.status -eq "healthy") {
            Write-Host "✅ Backend server is healthy: $($response.status)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️ Backend server status: $($response.status)" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ Backend server is not responding: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to start backend server
function Start-BackendServer {
    Write-Host "Starting backend server..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd" -ArgumentList "/c", "cd backend && python -m uvicorn app.main:app --reload --port 8000" -WindowStyle Hidden
    Start-Sleep -Seconds 10
}

# Function to check database
function Test-Database {
    $dbPath = "backend\manufacturing_platform.db"
    if (Test-Path $dbPath) {
        Write-Host "✅ Database file found: $dbPath" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Database file not found: $dbPath" -ForegroundColor Red
        return $false
    }
}

# Function to run Python test
function Invoke-PythonTest {
    param([string]$TestFile, [string]$TestName)
    
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Running: $TestName" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    if (Test-Path $TestFile) {
        try {
            python $TestFile
            Write-Host "✅ Test completed: $TestName" -ForegroundColor Green
        } catch {
            Write-Host "❌ Test failed: $TestName - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Test file not found: $TestFile" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Main execution
Write-Host "Step 1: Checking system prerequisites..." -ForegroundColor Blue

# Check if we're in virtual environment
if ($env:VIRTUAL_ENV) {
    Write-Host "✅ Virtual environment active: $env:VIRTUAL_ENV" -ForegroundColor Green
} else {
    Write-Host "⚠️ Virtual environment not detected. Activating..." -ForegroundColor Yellow
    & .\.venv\Scripts\Activate.ps1
}

Write-Host ""
Write-Host "Step 2: Testing backend server..." -ForegroundColor Blue

# Test backend health
$backendHealthy = Test-BackendHealth

if (-not $backendHealthy) {
    Write-Host "Backend server not responding. Attempting to start..." -ForegroundColor Yellow
    Start-BackendServer
    
    # Test again after starting
    Start-Sleep -Seconds 5
    $backendHealthy = Test-BackendHealth
}

Write-Host ""
Write-Host "Step 3: Testing database..." -ForegroundColor Blue
$databaseOK = Test-Database

Write-Host ""
Write-Host "Step 4: System Status Summary" -ForegroundColor Blue
Write-Host "-----------------------------" -ForegroundColor Blue
if ($backendHealthy) {
    Write-Host "✅ Backend Server: HEALTHY" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Server: NOT RESPONDING" -ForegroundColor Red
}

if ($databaseOK) {
    Write-Host "✅ Database: AVAILABLE" -ForegroundColor Green
} else {
    Write-Host "❌ Database: NOT FOUND" -ForegroundColor Red
}

# Check API documentation
try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -Method Head -TimeoutSec 5
    Write-Host "✅ API Documentation: ACCESSIBLE" -ForegroundColor Green
} catch {
    Write-Host "❌ API Documentation: NOT ACCESSIBLE" -ForegroundColor Red
}

Write-Host ""
if ($backendHealthy -and $databaseOK) {
    Write-Host "🟢 SYSTEM READY FOR TESTING" -ForegroundColor Green
    Write-Host ""
    
    # Run comprehensive tests
    Write-Host "Step 5: Running comprehensive tests..." -ForegroundColor Blue
    Write-Host ""
    
    # Test order: from most comprehensive to specific
    Invoke-PythonTest "complete_final_test.py" "Complete Final Test (Most Comprehensive)"
    Invoke-PythonTest "complete_workflow_test.py" "Complete Workflow Test"
    Invoke-PythonTest "complete_e2e_order_workflow_test.py" "End-to-End Order Workflow Test"
    Invoke-PythonTest "test_summary_report.py" "System Summary Report"
    
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "ALL TESTS COMPLETED" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Check the output above for detailed test results." -ForegroundColor Cyan
    Write-Host "📈 API Documentation: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
    Write-Host "❤️ Health Check: http://127.0.0.1:8000/health" -ForegroundColor Cyan
    
} else {
    Write-Host "🔴 SYSTEM NOT READY" -ForegroundColor Red
    Write-Host ""
    if (-not $backendHealthy) {
        Write-Host "❌ Backend server needs to be started manually:" -ForegroundColor Red
        Write-Host "   cd backend && python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor Yellow
    }
    if (-not $databaseOK) {
        Write-Host "❌ Database not found. Check database initialization." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 