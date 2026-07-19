# Glass Cinema v10.2

A flat, balanced, iPad-first Glass Cinema player with Apple system typography and a fixed-size library.

## v10.2 changes

- Added **154 built-in curated titles**: 94 movies and 60 series.
- Added every title and TMDB number from the current watchlist, including Captain Future, Sherlock-related series, The Odyssey, the essential recommendations, all released principal Star Wars theatrical films, all thirteen Star Trek feature films, and the selected Shakespeare adaptations.
- Search now checks **movies and series together**, regardless of the active Movie/Series tab, and automatically switches to the correct type when a result is selected.
- Added alternate-title matching for entries such as Capitaine Flam, BBC Sherlock, Shogun, and common franchise abbreviations.
- Rebuilt Continue Watching as a fixed-height, multi-column grid with a **vertical scrollbar**. New titles start a new row; the list can no longer widen the cinema or alter the player size.
- Increased Continue Watching capacity from 12 to 40 titles.
- The curated library is stored separately from the daily Vidrock synchronisation, so GitHub Actions cannot overwrite it.
- Preserved the iPad-first 2D layout, Apple system font stack, embedded playback, picture modes, and working three-dot menu.

## Upload

Upload the contents of this folder to the root of the GitHub Pages repository. Replace the previous files, including `index.html`, `styles.css`, `player.js`, `sw.js`, and the complete `catalogues` folder.

The service-worker cache is versioned as v10.2 so installed iPad copies refresh to the new layout.
