# Hasiru Shaale adoption – backend (Code.gs)

This folder holds the Apps Script backend of the school adoption app.

When `Code.gs` or `appsscript.json` in this folder changes on `main`, GitHub sends it to Apps Script
and makes it live by itself (same deployment, same /exec link). The steps are in
`.github/workflows/deploy-backend.yml`.

- Do not edit Code.gs in the Apps Script editor any more: the next update from here would overwrite it.
- Script Properties (Sheet and folder IDs) stay only in Apps Script, never here.
- After adding new Sheet columns, run `setupAll` once in Apps Script.
- Changes to index.html, privacy.html or any other folder never touch Apps Script.
