param(
    [string]$BaseUrl = "https://api.arzamart.com"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARZAMART API - HEALTH CHECK           " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Base URL: $BaseUrl" -ForegroundColor Yellow

$endpoints = @(
    "/api/products",
    "/api/categories",
    "/api/settings",
    "/api/custom-landing-page"
)

foreach ($ep in $endpoints) {
    $target = "$BaseUrl$ep"
    try {
        $response = Invoke-WebRequest -Uri $target -Method Get -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "[OK] ($($response.StatusCode)) - $target" -ForegroundColor Green
        } else {
            Write-Host "[WARN] ($($response.StatusCode)) - $target" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[FAIL] - $target : $($_.Exception.Message)" -ForegroundColor Red
    }
}
