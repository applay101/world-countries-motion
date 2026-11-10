# world-countries-motion

Automated English motion-graphics episodes about every country, for **Zoom World Travel** (@zoomworldtravel).

**Pipeline** (runs in GitHub Actions on every push to `episodes/<id>/script.json`):

1. `pipeline/voice.py` makes the narration with Kokoro TTS, then Whisper word timestamps for the subtitles.
2. `pipeline/prepare.py` merges script and timing into `src/data/episode.json` and rasterises the flag.
3. `pipeline/mix.py` mixes the music bed, scene SFX and the voice (loudness-normalised to -14 LUFS).
4. Remotion (React + Three.js + GSAP + d3-geo) renders 1920x1080 at 30 fps: a globe intro, a vector world map with the country filled by its flag, infographics, and word-by-word captions.
5. The MP4 is published as a release asset (`ep-<id>`), and `episodes/<id>/status.json` gets the link and the log tail.

**New episode:** add `episodes/<country>/script.json` (see `episodes/spain`) and push.
**Run again by hand:** Actions → Render episode → Run workflow → episode name.
