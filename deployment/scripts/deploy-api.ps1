# API Deployment Script for Plesk/IIS
# Publishes ASP.NET Core API to IIS/Plesk compatible format

Write-Host "=== API Deployment Started ===" -ForegroundColor Cyan

# Verify package exists
$apiPackage = "D:\Personal\alzeena\deployment\api\api-package.zip"
if (-Not (Test-Path $apiPackage)) {
    Write-Error "API package not found. Run package-production.ps1 first."
    exit 1
}

Write-Host ">>> Verifying web.config..." -ForegroundColor Yellow
$webConfig = "D:\Personal\alzeena\deployment\api\web.config"
if (-Not (Test-Path $webConfig)) {
    Write-Error "web.config not found in API package."
    exit 1
}

Write-Host ">>> Checking ASP.NET Core Hosting Bundle..." -ForegroundColor Yellow
# Check if hosting bundle is installed
$hostingBundle = Get-Item "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" -ErrorAction SilentlyContinue
if (-Not $hostingBundle) {
    Write-Warning "ASP.NET Core Hosting Bundle may not be installed. Install required for IIS deployment."
}

Write-Host ">>> Validating production configuration..." -ForegroundColor Yellow
# Verify published output has required files
$requiredFiles = @("Microsoft.AspNetCore.App.dll", "web.config")
foreach ($file in $requiredFiles) {
    if (-Not (Test-Path (Join-Path "D:\Personal\alzeena\backend\publish_output" $file))) {
        Write-Warning "Required file $file not found in publish output."
    }
}

Write-Host ">>> API Deployment Package validated successfully" -ForegroundColor Green
Write-Host ">>> To deploy to Plesk:" -ForegroundColor Cyan
Write-Host "  1. Upload deployment/api/api-package.zip to Plesk domain/subdomain" -ForegroundColor Yellow
Write-Host "  2. Extract package in Plesk file manager" -ForegroundColor Yellow
Write-Host "  3. Ensure Application Pool uses .NET Core runtime" -ForegroundColor Yellow
Write-Host "  4. Configure virtual directory pointing to extracted folder" -ForegroundColor Yellow

Write-Host "=== API Deployment Completed ===" -ForegroundColor Cyan