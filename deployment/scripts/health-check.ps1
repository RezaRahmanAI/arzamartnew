# Health Check Script for Alzeena E-Commerce System
param (
    [string]$ApiUrl = "https://testapi.arzamart.com/health",
    [string]$WebUrl = "http://test.arzamart.com"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Running Alzeena Production Health Checks " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check API Health
try {
    Write-Host "Testing API Endpoint: $ApiUrl..." -NoNewline
    $apiResp = Invoke-WebRequest -Uri $ApiUrl -TimeoutSec 10 -UseBasicParsing
    if ($apiResp.StatusCode -eq 200) {
        Write-Host " [PASS 200 OK]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL $($apiResp.StatusCode)]" -ForegroundColor Red
    }
} catch {
    Write-Host " [FAIL: $($_.Exception.Message)]" -ForegroundColor Red
}

# Check Frontend Health
try {
    Write-Host "Testing Frontend Endpoint: $WebUrl..." -NoNewline
    $webResp = Invoke-WebRequest -Uri $WebUrl -TimeoutSec 10 -UseBasicParsing
    if ($webResp.StatusCode -eq 200) {
        Write-Host " [PASS 200 OK]" -ForegroundColor Green
    } else {
        Write-Host " [FAIL $($webResp.StatusCode)]" -ForegroundColor Red
    }
} catch {
    Write-Host " [FAIL: $($_.Exception.Message)]" -ForegroundColor Red
}
