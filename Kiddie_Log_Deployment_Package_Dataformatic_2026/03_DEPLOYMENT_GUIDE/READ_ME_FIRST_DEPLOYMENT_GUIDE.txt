KIDDIE LOG DEPLOYMENT GUIDE
Dataformatic Production 2026

This package separates the project so you do not mix the files again.

FOLDER 01_GOOGLE_APPS_SCRIPT_REAL_APP
Use these inside Google Apps Script only:
- Code.gs
- SetupSheets.gs
- Index.html

Deployment:
1. Open the Google Sheet connected to Kiddie Log.
2. Go to Extensions > Apps Script.
3. Replace or create these files:
   - Code.gs
   - SetupSheets.gs
   - Index.html
4. Save.
5. Run setupAllSheets() once if the sheets are not already created.
6. Authorize permissions.
7. Deploy > New deployment > Web app.
8. Execute as: Me.
9. Access: Anyone with the link, or restricted church users.
10. Copy the Web App URL ending in /exec.

FOLDER 02_GITHUB_PAGES_LAUNCHER_ONLY
Use this for GitHub Pages only:
- index.html

Deployment:
1. Open your GitHub repository.
2. Replace the repository root index.html with this file.
3. Commit changes.
4. GitHub Pages will show the launcher.
5. Users tap Open App and are sent to the Apps Script /exec URL.

DO NOT DO THIS:
- Do not put the Apps Script Index.html on GitHub Pages.
- Do not use /dev URL for church users.
- Do not judge Apps Script behavior from content:// local Android preview.

Current embedded Apps Script URL in GitHub launcher:
https://script.google.com/macros/s/AKfycbyi6GvFZh14Sc5KowiASruLRxdDmaeNbPvKmgYzJgqU/exec

If you redeploy Apps Script and the /exec URL changes:
- Open 02_GITHUB_PAGES_LAUNCHER_ONLY/index.html
- Replace APP_URL with the new /exec URL.
- Commit to GitHub again.

FILES VALIDATION INCLUDED
- Apps Script files are separated from GitHub files.
- GitHub launcher contains no google.script.run calls.
- Apps Script Index.html remains in the Apps Script folder only.
- Mobile launcher uses viewport-fit, svh/dvh, and safe-area support.
