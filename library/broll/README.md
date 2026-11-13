# Digital library: b-roll footage (real video)

Real, free footage of cities, landscapes and landmarks from **Pexels** and **Pixabay**, for `footage` scenes.

- `index.json`: every clip with its id (`pexels-123`, `pixabay-456`), search query, length, author, page link and licence.
- `previews/<query>.jpg`: numbered contact sheet per search, to pick clips by eye.
- The video files are assets of the GitHub release **library-broll** (1920×1080, 30 fps, no sound, ≤ 12 s).

## Add footage
- Add a line to `requests.txt` (e.g. `Kyoto temple | 6`) and push, or
- Actions → "Fetch b-roll footage" → Run workflow → queries separated by `;`.

Needs the repo secrets `PEXELS_API_KEY` (pexels.com/api) and/or `PIXABAY_API_KEY` (pixabay.com/api/docs). Both are free.

## Licences and credits
Pexels License and Pixabay Content License: free to use, also commercially, no attribution required, but we always credit:
the engine shows "Footage: <author> / <source>" on screen and `status.json` lists `footage_credits` for the video description.
Keep requests modest (a handful of clips per search): both APIs forbid mass downloading.
