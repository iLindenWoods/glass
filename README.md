# Glass Cinema — Apple Glass Luminance Enhanced v7.2

This build keeps the exact visual palette and working embedded playback architecture of v7.0.

## Enhanced Screen v7.2

Enhanced Screen now preserves the source colours. It does not apply saturation, hue rotation, sepia, tinting or white-balance changes. It uses only restrained luminance-domain presentation adjustments:

- subtle contrast recovery;
- a very small brightness lift;
- gentle highlight/shadow shaping;
- a low-strength luminosity overlay for perceived clarity.

This is browser-level optical enhancement, not AI upscaling. Because the video is inside a third-party iframe, Safari does not expose its decoded pixels for true sharpening or denoising.

The catalogue sync workflow, local catalogue search, direct ID entry, embedded playback and fallback route are retained from v7.0.
