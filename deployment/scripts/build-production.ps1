# Alzeena Production Build Script for Windows Server / Plesk
param (
    [string]$RootDir = "d:\Personal\alzeena"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building Alzeena Backend & Frontend " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Backend
Write-Host "`n[1/2] Building ASP.NET Core Web API..." -ForegroundColor Yellow
$BackendProj = Join-Path $RootDir "backend\src\Presentation\Ecommerce.Api\Ecommerce.Api.csproj"
$PublishDir = Join-Path $RootDir "publish_backend"

dotnet restore $BackendProj
dotnet build $BackendProj -c Release
dotnet publish $BackendProj -c Release -o $PublishDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Backend publish failed!" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Backend published to $PublishDir" -ForegroundColor Green

# 2. Build Frontend
Write-Host "`n[2/2] Building Next.js Frontend..." -ForegroundColor Yellow
$FrontendDir = Join-Path $RootDir "frontend"

Set-Location $FrontendDir
cmd /c npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "SUCCESS: Frontend built successfully!" -ForegroundColor Green
