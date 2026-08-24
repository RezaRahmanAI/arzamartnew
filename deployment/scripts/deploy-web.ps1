# Next.js Web Deployment Script
# Deploys Next.js standalone output to Plesk Node.js hosting

Write-Host "=== Web Deployment Started ===" -ForegroundColor Cyan

# Verify frontend package exists
$webPackage = "D:\Personal\alzeena\deployment\web\frontend-package.zip"
if (-Not (Test-Path $webPackage)) {
    Write-Error "Frontend package not found. Run package-production.ps1 first."
    exit 1
}

Write-Host ">>> Checking Plesk Node.js hosting support..." -ForegroundColor Yellow
# Check if Plesk supports Node.js applications
$pleskNodeSupport = Get-PSModule -Name "Plesk" -ErrorAction SilentlyContinue
if (-Not $pleskNodeSupport) {
    Write-Warning "Plesk PowerShell module not found. Ensure Plesk Node.js hosting is enabled."
}

Write-Host ">>> Validating Next.js standalone output..." -ForegroundColor Yellow
$standaloneDir = "D:\Personal\alzeena\frontend\.next\standalone"
if (-Not (Test-Path $standaloneDir)) {
    Write-Warning "Next.js standalone output not detected. Building with output: 'standalone' mode..."
    Write-Host ">>> To enable standalone mode, update next.config.ts:" -ForegroundColor Cyan
    Write-Host "    output: 'standalone'" -ForegroundColor Yellow
}

Write-Host ">>> Upload package to Plesk:" -ForegroundColor Cyan
Write-Host "  1. Upload deployment/web/frontend-package.zip to Plesk" -ForegroundColor Yellow
Write-Host "  2. Extract in httpdocs or subdomain directory" -ForegroundColor Yellow
Write-Host "  3. Ensure Node.js version matches production requirements" -ForegroundColor Yellow
Write-Host "  4. Set environment variables in Plesk (NODE_ENV=production)" -ForegroundColor Yellow

Write-Host "=== Web Deployment Completed ===" -ForegroundColor Cyan