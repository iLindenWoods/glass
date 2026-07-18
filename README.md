# Glass Cinema — Apple Glass Enhanced v7.0

This version keeps the working in-app Vidrock embed, restores the warmer Apple-glass colour system from v5, and adds an **Enhanced Screen** optical layer over the embedded player.

## Catalogue search

Vidrock's catalogue JSON can be blocked by browser CORS rules. This package includes a free GitHub Action that mirrors the two catalogue files into your own repository, where the app can read them reliably.

After uploading all files, open **GitHub → Actions → Sync Vidrock catalogues → Run workflow** once. The action then refreshes the files automatically every day.

No paid API, API key, analytics service, or advertising library is used.

## Picture modes

- **Original** — provider image unchanged.
- **Enhanced Screen** — mild contrast and saturation recovery plus a translucent optical layer.
- **Glass Clear** — lighter, restrained clarity.
- **Cinema** — slightly deeper blacks and softer colour.

These modes improve presentation but cannot reconstruct detail absent from the source.
