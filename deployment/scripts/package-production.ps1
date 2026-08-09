# Alzeena Production Packaging Script for Plesk
param (
    [string]$RootDir = "d:\Personal\alzeena"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Packaging Production Deployment Archives " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Package Backend
$BackendPublish = Join-Path $RootDir "publish_backend"
$BackendZip = Join-Path $RootDir "backend_publish.zip"

if (Test-Path $BackendZip) { Remove-Item $BackendZip -Force }
Compress-Archive -Path "$BackendPublish\*" -DestinationPath $BackendZip -CompressionLevel Optimal
Write-Host "Created $BackendZip" -ForegroundColor Green

# 2. Package Frontend Light (Optimized without .next/cache)
$FrontendDir = Join-Path $RootDir "frontend"
$TempDir = Join-Path $RootDir "frontend_temp_publish"
$FrontendZip = Join-Path $RootDir "frontend_publish_light.zip"

if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

Copy-Item -Path "$FrontendDir\.next" -Destination "$TempDir\.next" -Recurse
if (Test-Path "$TempDir\.next\cache") { Remove-Item "$TempDir\.next\cache" -Recurse -Force }
Copy-Item -Path "$FrontendDir\public" -Destination "$TempDir\public" -Recurse
Copy-Item -Path "$FrontendDir\package.json" -Destination "$TempDir\package.json"
Copy-Item -Path "$FrontendDir\.env.production" -Destination "$TempDir\.env.production"
Copy-Item -Path "$FrontendDir\public\web.config" -Destination "$TempDir\web.config"
Copy-Item -Path "$FrontendDir\app.js" -Destination "$TempDir\app.js"

if (Test-Path $FrontendZip) { Remove-Item $FrontendZip -Force }
Compress-Archive -Path "$TempDir\*" -DestinationPath $FrontendZip -CompressionLevel Optimal
Remove-Item $TempDir -Recurse -Force

Write-Host "Created $FrontendZip" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Packaging Completed Successfully! " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
