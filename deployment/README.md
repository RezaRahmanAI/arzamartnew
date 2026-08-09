# ALZEENA PRODUCTION DEPLOYMENT SUITE

This folder contains deployment scripts, configuration files, and documentation for building, packaging, and deploying the Alzeena E-Commerce platform to a Plesk/IIS Windows Server environment.

## Directory Layout
- `scripts/`: PowerShell build, package, deploy, and health check scripts.
- `config/`: Configuration templates (`.env.example`, `appsettings.Production.json`, `web.config` files).
- `docs/`: Step-by-step Plesk deployment guide (`PLESK_DEPLOYMENT_GUIDE.md`) and rollback instructions (`ROLLBACK_GUIDE.md`).

## Quick Start
1. To build both frontend and backend:
   `powershell -File deployment/scripts/build-production.ps1`
2. To generate production deployment ZIP archives:
   `powershell -File deployment/scripts/package-production.ps1`
3. To run health checks against live endpoints:
   `powershell -File deployment/scripts/health-check.ps1`
