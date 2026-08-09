# Alzeena Web Deployment Validation Script
param (
    [string]$ZipPath = "d:\Personal\alzeena\frontend_publish_light.zip"
)

Write-Host "Checking Web Deployment Package..." -ForegroundColor Cyan

if (Test-Path $ZipPath) {
    $Size = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
    Write-Host "VALID: $ZipPath exists ($Size MB)" -ForegroundColor Green
} else {
    Write-Host "ERROR: $ZipPath not found!" -ForegroundColor Red
}
