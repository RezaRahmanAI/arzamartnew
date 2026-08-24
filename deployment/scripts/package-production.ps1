# Production Package Script
# Creates deployment packages for API and Web frontend

Write-Host "=== Production Package Started ===" -ForegroundColor Cyan

# Frontend package
Write-Host ">>> Packaging Frontend..." -ForegroundColor Yellow
$frontendBuildDir = "D:\Personal\alzeena\frontend\next-build"
if (-Not (Test-Path $frontendBuildDir)) {
    Write-Error "Frontend build directory not found. Run build-production.ps1 first."
    exit 1
}
# Create zip of .next directory for standalone deployment
Compress-Archive -Path "D:\Personal\alzeena\frontend\.next" -DestinationPath "D:\Personal\alzeena\deployment\web\frontend-package.zip"
Write-Host ">>> Frontend package created at deployment/web/frontend-package.zip" -ForegroundColor Green

# Backend package
Write-Host ">>> Packaging Backend..." -ForegroundColor Yellow
$backendPublishDir = "D:\Personal\alzeena\backend\publish_output"
if (-Not (Test-Path $backendPublishDir)) {
    Write-Error "Backend publish directory not found. Run build-production.ps1 first."
    exit 1
}
Compress-Archive -Path "D:\Personal\alzeena\backend\publish_output\*" -DestinationPath "D:\Personal\alzeena\deployment\api\api-package.zip"
Write-Host ">>> Backend package created at deployment/api/api-package.zip" -ForegroundColor Green

Write-Host "=== Production Package Completed ===" -ForegroundColor Cyan