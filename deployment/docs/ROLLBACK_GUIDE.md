# ROLLBACK GUIDE — ALZEENA E-COMMERCE

## Overview
In the event of a deployment failure or unexpected issue in production, follow this step-by-step procedure to safely roll back to the previous stable state.

---

## 1. Backend Rollback

1. Log into **Plesk Panel** -> **File Manager**.
2. Open the API directory (e.g., `testapi`).
3. Select all newly extracted DLL files and delete them.
4. Upload your previous backup ZIP archive (e.g., `backend_publish_backup.zip`).
5. Extract the backup files into the API directory.
6. Verify API health at `https://testapi.arzamart.com/health`.

---

## 2. Frontend Rollback

1. In Plesk Panel, go to **Websites & Domains** -> **Node.js**.
2. Click **Disable Node.js**.
3. In **File Manager**, open the site directory (e.g., `test1`).
4. Delete the existing `.next` directory.
5. Upload your previous backup ZIP archive (e.g., `frontend_publish_light_backup.zip`).
6. Extract the backup archive.
7. Return to **Node.js** settings in Plesk and click **Enable Node.js** / **Restart App**.
