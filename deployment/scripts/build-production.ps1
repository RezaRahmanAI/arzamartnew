param(
    [string]$Configuration = "Release",
    [string]$OutputDir = "..\api"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARZAMART API - PRODUCTION BUILD       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$projectPath = "$PSScriptRoot\..\..\backend\src\Presentation\Ecommerce.Api\Ecommerce.Api.csproj"
$targetOut = "$PSScriptRoot\$OutputDir"

if (-not (Test-Path $projectPath)) {
    Write-Error "Project file not found at: $projectPath"
    exit 1
}

Write-Host "Restoring dependencies..." -ForegroundColor Yellow
dotnet restore $projectPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Restore failed!"
    exit 1
}

Write-Host "Building and publishing project ($Configuration)..." -ForegroundColor Yellow
dotnet publish $projectPath -c $Configuration -o $targetOut

if ($LASTEXITCODE -ne 0) {
    Write-Error "Publish failed!"
    exit 1
}

Write-Host "`n[SUCCESS] API production publish completed successfully in $targetOut" -ForegroundColor Green
