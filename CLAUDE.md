# How to make an episode (for Claude sessions working in this repo)

Channel: **Zoom World Travel** (@zoomworldtravel), English. Every video is about one country. The video itself and everything published with it (script, captions, title, description, tags) are in English. Messages to the owner (Hossein) are in **Persian**.

## Pipeline
Push `episodes/<id>/script.json` to `main`, and GitHub Actions (`.github/workflows/render.yml`) does the rest: TTS narration, Whisper timing, music and SFX, Remotion render. It publishes `https://github.com/applay101/world-countries-motion/releases/download/ep-<id>/<id>.mp4` and commits `episodes/<id>/status.json` (status, size, log tail). Rendering a 4-minute episode takes about 15 minutes.
Check progress without auth: `curl -s https://api.github.com/repos/applay101/world-countries-motion/actions/runs?per_page=3`.

## Choosing a topic (trending episodes)
First check `ideas.md`: if it has an unchecked `- [ ]` idea, use the first one (it may be in Persian), and mark it `- [x]` in the same commit. Otherwise:
Pick a country that people are talking about **right now**: news of the last 7 days, viral social posts, a major event, travel trends, a record or a festival. Search the web for it and confirm the story is real and current, from at least two reputable sources.
- Choose a different country from the last 5 episodes (`ls episodes/`).
- The episode id is a lowercase slug: `<country>` or `<country>-<topic>` (e.g. `japan-cherry-blossom-2027`).
- The angle is: hook on the current story, then a country profile that gives viewers context (where it is, numbers, geography, history, culture, economy and travel). Keep it neutral and factual. No opinions on politics, no partisan framing, nothing graphic. Wars, disasters and tragedies are covered respectfully, with no sensationalism. Never invent quotes.
- Every number must come from a source you just read (official statistics office, UN, World Bank, IMF, UNESCO, reputable news). Put the source in the `note` field where the schema allows it.

## script.json schema (copy `episodes/spain/script.json` as the template)
- `id`, `country` {name, iso2 (flag-icons code), isoNum (ISO 3166 numeric, 3 digits, as in world-atlas), lon, lat (country centre), capital}
- `voice`: Kokoro voice (`af_heart` default; `am_michael`, `bm_george` also good). `speed` 0.96. `music`: `ambient` (default) or `spanish_guitar`.
- `segments`: 11 to 14 items, about 550 to 650 words in total (~4 min). Each one is `{id, text, scene}`.
  - **Write numbers and years as words in `text`** ("forty-nine point eight million", "nineteen seventy-eight") so the TTS reads them correctly. Short, punchy, spoken sentences.
  - The first segment's scene is `{"type":"globe"}`; its text ends with "This is <Country>." The last is `{"type":"outro"}` and asks viewers to subscribe and join the next country.
  - Scene types and fields:
    - `map`: `chapter`, `view` {lon, lat, span (visible degrees of longitude, about 2 to 2.5x the country width)}, optional `labels` [[name, lon, lat, "sea"?]], `markers` [[name, lon, lat, kind]] (kind: pin, dot, peak, star), `river` [[lon,lat]...] + `riverLabel`, `big` [["17","label"]] (right-hand number chips)
    - `stats`: like map plus `capital` [name, lon, lat] and `cards` [{label, value, suffix, fmt: int|1dp|2dp, note} or {label, text}]. Set the view lon about 0.15×span east of the country so it sits left of the panel.
    - `cities`: `view`, `cities` [[name, lon, lat]]
    - `timeline`: `events` [[year label, short text]] (3 to 5)
    - `cards`: `cards` [[icon, title, subtitle]] (icons: flamenco, clock, bull, tomato; any other name shows no icon, so it's fine to omit)
    - `bignum`: `value`, `suffix`, `label`, `note`, `chips` []
    - `bars`: `kpis` [{label, value, prefix, suffix, fmt}] and `bars` {title, items [[label, value]]}, `note`
  - Labels and markers appear when their first word is spoken, so use the exact spoken name.
- Check the map coordinates. Render previews before pushing if you can: `python pipeline/prepare.py` needs `build/timing.json`, so usually just push and check the stills from the finished video.

## After the render
1. Wait for `status.json` to show `success`, then download the MP4 and look at 6 to 9 frames (ffmpeg tile) to check the layout.
2. YouTube upload goes through the vidIQ connector: `vidiq_video_upload` (url = release asset), then `vidiq_social_post_draft_create` with an English title (under 70 chars, includes the country), description (summary, chapters with timestamps from timing.json, sources, #hashtags) and tags. Publishing needs the owner's approval of the draft: send him the draft and a push notification in Persian. Never publish without his approval.
