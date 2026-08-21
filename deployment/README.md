# Arzamart Deployment Packages & Documentation

This directory contains the production-ready publish artifacts and scripts for Arzamart e-commerce platform.

## Directory Structure
- `api/` - Complete pre-built Release binaries, dependencies, `web.config`, and configurations for ASP.NET Core Web API.
- `scripts/` - Automated PowerShell build and health check scripts (`build-production.ps1`, `health-check.ps1`).
- `docs/` - Step-by-step deployment instructions for Plesk, IIS, and Windows Server (`plesk-deployment-guide.md`).

## Quick Deployment
1. Upload all files from `deployment/api/` into your Plesk domain root (`httpdocs/`).
2. Verify that IIS Application Pool is set to **No Managed Code**.
3. Set your SQL Server connection string in `appsettings.json`.
