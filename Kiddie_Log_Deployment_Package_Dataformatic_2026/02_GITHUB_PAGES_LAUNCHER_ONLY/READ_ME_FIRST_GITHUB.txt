GITHUB PAGES - LAUNCHER ONLY

Upload ONLY this folder's index.html to GitHub Pages.

This GitHub page is only the branded front door. It opens the real Google Apps Script Web App.

Do NOT upload the Apps Script Index.html here.
If you host the real app Index.html on GitHub, the menu will show but fail because google.script.run does not exist on GitHub.

To change the app destination:
- Open index.html in this folder.
- Find APP_URL.
- Replace it with your latest Apps Script Web App URL ending in /exec.
