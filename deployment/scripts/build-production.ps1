# Production Build Script
# Runs: npm ci && npm run build for Next.js
#        dotnet restore && dotnet build -c Release && dotnet publish -c Release for ASP.NET Core

Write-Host "=== Production Build Started ===" -ForegroundColor Cyan

# Frontend build
Write-Host ">>> Building Frontend..." -ForegroundColor Yellow
Set-LiteralPath D:\Personal\alzeena\frontend
cd D:\Personal\alzeena\frontend
npm ci
npm run build

Write-Host ">>> Frontend build completed successfully" -ForegroundColor Green

# Backend build
Write-Host ">>> Building Backend..." -ForegroundColor Yellow
Set-LiteralPath D:\Personal\alzeena\backend
cd D:\Personal\alzeena\backend
dotnet restore
dotnet build -c Release
dotnet publish -c Release -o ./publish_output

Write-Host ">>> Backend build completed successfully" -ForegroundColor Green

Write-Host "=== Production Build Completed ===" -ForegroundColor Cyan