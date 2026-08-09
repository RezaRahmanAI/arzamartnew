# PLESK DEPLOYMENT GUIDE — ALZEENA E-COMMERCE

## Overview
This guide describes the exact steps to deploy the Alzeena E-Commerce application (ASP.NET Core API + Next.js Frontend) to a Windows Server hosting environment using Plesk Panel.

---

## 1. Backend (ASP.NET Core API) Deployment

1. Log into your **Plesk Panel**.
2. Navigate to **Websites & Domains** -> Select your API domain/subdomain (e.g., `testapi.arzamart.com`).
3. Click **File Manager** and enter the target domain directory (e.g., `httpdocs` or `testapi`).
4. Upload `backend_publish.zip`.
5. Select `backend_publish.zip` and click **Extract Files**.
6. Verify that `appsettings.json` and `web.config` exist in the root of the API directory.
7. Test the health endpoint: `https://testapi.arzamart.com/health` (should return `Healthy` with HTTP 200).

---

## 2. Frontend (Next.js) Deployment

1. Navigate to **Websites & Domains** -> Select your main website domain (e.g., `test.arzamart.com`).
2. Click **File Manager** and enter the site root directory (e.g., `test1`).
3. If an `index.html` default placeholder file exists, select and **Remove** it.
4. Upload `frontend_publish_light.zip`.
5. Select `frontend_publish_light.zip` and click **Extract Files**.
6. Navigate back to **Websites & Domains** -> Click **Node.js**.
7. Configure the Node.js settings:
   - **Node.js Version**: `18.x`, `20.x`, or `24.x`
   - **Application Mode**: `production`
   - **Application Root**: `/test1` *(Do not add `/public` to Application Root)*
   - **Document Root**: `/test1/public`
   - **Application Startup File**: `app.js`
8. Click **+ NPM install** to install required packages.
9. Click **Enable Node.js** or **Restart App**.
10. Open `http://test.arzamart.com` in your browser.
