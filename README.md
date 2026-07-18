# Glass Cinema — Valora × Elara v4.0

GitHub Pages-ready iPad web app. No paid APIs or embedded API keys.

## Why playback defaults to same-window mode
Vidrock may block playback when placed inside an iframe on another website. Same-window mode navigates directly to the player route, avoiding that frame restriction. Use Safari's Back button to return.

## Updating an existing GitHub repository
Upload and replace these files at the repository root:
- index.html
- styles.css
- player.js
- manifest.webmanifest
- sw.js
- icons/icon180.png
- icons/icon192.png
- icons/icon512.png

After committing, wait for GitHub Pages to redeploy. If the old design remains, remove the Home Screen icon, open the GitHub Pages URL in Safari, reload it, then add it to the Home Screen again.
