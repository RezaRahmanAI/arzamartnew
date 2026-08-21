# Plesk & Windows Server IIS Deployment Guide for Arzamart API

## 1. Hosting Requirements
- **Web Server:** IIS (Internet Information Services) on Windows Server / Plesk
- **.NET Runtime:** ASP.NET Core 9.0 / 10.0 Hosting Bundle installed on the Windows Server
- **Database:** Microsoft SQL Server (2019 / 2022 / Azure SQL)

---

## 2. Plesk IIS Setup Steps

1. **Create Subdomain/Domain in Plesk:**
   - E.g., `api.arzamart.com`
   - Document Root: `httpdocs`

2. **Upload Published Files:**
   - Upload all contents from the `deployment/api/` folder directly to the root of `httpdocs/`.
   - Ensure `web.config` and `Ecommerce.Api.dll` are located at the root of `httpdocs/`.

3. **Verify IIS Application Pool Settings:**
   - In Plesk > **Hosting Settings / IIS Application Pool**:
   - .NET CLR Version: **No Managed Code** (Unmanaged)
   - Managed Pipeline Mode: **Integrated**

4. **Verify Folder Permissions:**
   - Grant `IIS_IUSRS` and `IUSR` Read & Execute permissions to the `httpdocs/` folder.
   - For image uploads / logs, ensure `Write` permissions are granted to `httpdocs/logs` and `httpdocs/uploads`.

5. **Configure Production Connection String:**
   - Open `appsettings.json` (or `appsettings.Production.json`) in the Plesk File Manager.
   - Verify SQL Server `DefaultConnection` string and `JwtSettings.Secret`.

6. **Test API Health:**
   - Visit `https://api.arzamart.com/api/products` in your browser.
   - If enabled, Swagger UI is available at `https://api.arzamart.com/swagger`.
