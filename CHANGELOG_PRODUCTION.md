# CHANGELOG_PRODUCTION.md — Alzeena Production Audit & Release Notes

## Release Date: 2026-08-09
## Target Platform: Windows Server + IIS + Plesk Panel
## Stack: Next.js 15 + ASP.NET Core Web API (.NET 10) + SQL Server

---

### 🟢 What Was Fixed & Added:

1. **Backend Health Check Endpoint Added**:
   - Added `builder.Services.AddHealthChecks()` and `app.MapHealthChecks("/health")` to `Program.cs`.
   - Allows lightweight, secret-safe uptime monitoring.

2. **IIS / Plesk `web.config` Rewrite Rules Fixed**:
   - Updated `frontend/public/web.config` to use standard IISNode handlers and dynamic rewrites to `app.js`.
   - Eliminates `500 - Internal Server Error` caused by circular rewrite loops.

3. **Node.js Entry Point (`app.js`) Created**:
   - Added standard HTTP `app.js` entry point for Next.js 15 custom server execution under Plesk Phusion Passenger / IISNode.

4. **Frontend Package Optimization**:
   - Excluded `.next/cache` directory from production ZIP package.
   - Reduced package size from **188 MB to 2.23 MB**, enabling fast upload and extraction in Plesk File Manager.

5. **Automated PowerShell Build & Package Automation**:
   - Created `deployment/scripts/build-production.ps1`
   - Created `deployment/scripts/package-production.ps1`
   - Created `deployment/scripts/health-check.ps1`

6. **Documentation & Deployment Instructions**:
   - Created comprehensive Plesk step-by-step guides, rollback procedures, and environment variable documentation.

---

### 🟢 Build Verification:
- **Backend (.NET 10 Web API)**: `dotnet publish -c Release` succeeded (Code 0).
- **Frontend (Next.js 15)**: `npm run build` succeeded (Code 0).
- **Packages Generated**: `backend_publish.zip` (7.5 MB), `frontend_publish_light.zip` (2.23 MB).
