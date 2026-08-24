# Health Check Script
# Verifies application health without exposing sensitive information

Write-Host "=== Health Check Started ===" -ForegroundColor Cyan

# API Health Check
Write-Host ">>> Checking API Endpoint..." -ForegroundColor Yellow
$apiBaseUrl = "https://localhost:5001" # Should be replaced with actual production URL
try {
    $response = Invoke-RestMethod -Method Get -Uri "$apiBaseUrl/health" -TimeoutSec 10
    Write-Host ">>> API Health: OK" -ForegroundColor Green
    Write-Host ">>> Response: $($response.status)" -ForegroundColor Green
} catch {
    Write-Warning ">>> API health check failed - endpoint unreachable or returned error"
}

# Frontend Health Check
Write-Host ">>> Checking Frontend..." -ForegroundColor Yellow
$frontendUrl = "https://localhost:3000"
try {
    $response = Invoke-RestMethod -Method Get -Uri "$frontendUrl" -TimeoutSec 10
    Write-Host ">>> Frontend Health: OK" -ForegroundColor Green
} catch {
    Write-Warning ">>> Frontend health check failed - endpoint unreachable or returned error"
}

# Database Connectivity (optional - only if connection string is configured)
Write-Host ">>> Checking Database Configuration..." -ForegroundColor Yellow
$connString = Get-ItemProperty -Path "D:\Personal\alzeena\backend\appsettings.Production.json" -ErrorAction SilentlyContinue | Select-String -Pattern "ConnectionString" -ErrorAction SilentlyContinue
if ($connString) {
    Write-Host ">>> Database connection string configured" -ForegroundColor Green
    # Do NOT attempt actual connection to avoid exposing credentials
} else {
    Write-Warning ">>> No database connection string found in production config"
}

Write-Host "=== Health Check Completed ===" -ForegroundColor Cyan

# Summary output
Write-Host "" -ForegroundColor Cyan
Write-Host "Health Check Summary:" -ForegroundColor Yellow
Write-Host "  - API Endpoint: $(if (Invoke-RestMethod -Method Get -Uri '$apiBaseUrl/health' -TimeoutSec 5 -ErrorAction SilentlyContinue) { 'Reachable' } else { 'Unreachable' })" -ForegroundColor White
Write-Host "  - Frontend: $(if (Invoke-RestMethod -Method Get -Uri '$frontendUrl' -TimeoutSec 5 -ErrorAction SilentlyContinue) { 'Reachable' } else { 'Unreachable' })" -ForegroundColor White