# Glass Cinema v10.3

A flat, balanced, iPad-first Glass Cinema player with Apple system typography, a fixed-size library, and clearly visible TMDB numbers.

## v10.3 changes

- Search results now display a dedicated **TMDB / IMDb number badge** beside every title.
- Selecting a result fills the number field and keeps the identifier clearly visible in the Selected card.
- Continue Watching now includes each title's TMDB number.
- Added or refreshed: **Andor (83867), Foundation (93740), Sense8 (61664), Dark (70523), Stranger Things (66732), Battlestar Galactica (1972), Pluribus (225171), The White Lotus (111803), and Stuart Fails to Save the Universe (287620)**.
- Added spelling aliases such as *Battlestar Gallactica*, *Sense 8*, *PLUR1BUS*, *Wycaro*, and *Star Wars: Andor*.
- The built-in catalogue now contains **157 titles**: 94 movies and 63 series.
- Preserved the fixed-height, vertically scrolling Continue Watching grid so the cinema and player never widen as history grows.
- Preserved the warm neutral 2D palette, Apple system font stack, embedded playback, picture modes, and working three-dot menu.

## Upload

Upload the contents of this folder to the root of the GitHub Pages repository, replacing the previous files. Include the complete `catalogues` folder.

The service-worker cache is versioned as **v10.3** so installed iPad copies refresh to the updated search interface. After uploading, open the site once with `?v=10.3`.
