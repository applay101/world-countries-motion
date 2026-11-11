# How to make an episode (for Claude sessions working in this repo)

Channel: **Zoom World Travel** (@zoomworldtravel), English. Every video is about one country. The video itself and everything published with it (script, captions, title, description, tags) are in English. Messages to the owner (Hossein) are in **Persian**.

## Pipeline
Push `episodes/<id>/script.json` to `main`, and GitHub Actions (`.github/workflows/render.yml`) does the rest: TTS narration, Whisper timing, music and SFX, Remotion render. It publishes `https://github.com/applay101/world-countries-motion/releases/download/ep-<id>/<id>.mp4` and commits `episodes/<id>/status.json` (status, size, log tail). Rendering a 4-minute episode takes about 15 minutes.
Check progress without auth: `curl -s https://api.github.com/repos/applay101/world-countries-motion/actions/runs?per_page=3`.

## Tutorial episodes (education)
Practical how-to guides for people from anywhere in the world, e.g. how to apply for Spanish residency online, how to book a police appointment (cita previa) for fingerprints / TIE, how to get an NIE, digital nomad visa steps, and similar guides for other countries. Use ONLY official sources (government sites such as sede.administracionespublicas.gob.es, exteriores.gob.es, inclusion.gob.es, policia.es) and say "rules can change, always check the official site" in the outro. Use `steps` and `checklist` scenes with a `map` intro of the country. Never show a fake copy of a government website; the `url` bar only shows the real address as text. Episode id e.g. `spain-how-to-book-cita-previa`.

## Choosing a topic (trending episodes)
First check `ideas.md`: if it has an unchecked `- [ ]` idea, use the first one (it may be in Persian), and mark it `- [x]` in the same commit. Otherwise:
Pick a country that people are talking about **right now**: news of the last 7 days, viral social posts, a major event, travel trends, a record or a festival. Search the web for it and confirm the story is real and current, from at least two reputable sources.
- Choose a different country from the last 5 episodes (`ls episodes/`).
- The episode id is a lowercase slug: `<country>` or `<country>-<topic>` (e.g. `japan-cherry-blossom-2027`).
- The angle is: hook on the current story, then a country profile that gives viewers context (where it is, numbers, geography, history, culture, economy and travel). Keep it neutral and factual. No opinions on politics, no partisan framing, nothing graphic. Wars, disasters and tragedies are covered respectfully, with no sensationalism. Never invent quotes.
- Every number must come from a source you just read (official statistics office, UN, World Bank, IMF, UNESCO, reputable news). Put the source in the `note` field where the schema allows it.

## script.json schema (copy `episodes/spain/script.json` as the template)
- `id`, `country` {name, iso2 (flag-icons code), isoNum (ISO 3166 numeric, 3 digits, as in world-atlas), lon, lat (country centre), capital}
- `voice`: Kokoro voice (`af_heart` default; `am_michael`, `bm_george` also good). `speed` 1.0. `music`: `pulse` (energetic, default), `spanish_guitar` (rumba groove), `ambient`, `spanish_gentle`.
- `thumb`: {top, big, sub, badge}: the YouTube thumbnail text. `top` is a short hook in a yellow tag ("WORLD'S #1", "EXPLAINED", "STEP BY STEP"), `big` is the country or subject in 1–2 words, `sub` a 3–5 word promise, `badge` one striking number ("42.7M visitors"). Keep it punchy and true. It is rendered to `<id>-thumb.jpg` on the release.
- The engine is high-energy by design: the camera flies to every marker or city at the moment it is spoken, so put 3 to 7 markers in map/cities scenes and say their names in the text.
- `segments`: 11 to 14 items, about 550 to 650 words in total (~4 min). Each one is `{id, text, scene}`.
  - **Write numbers and years as words in `text`** ("forty-nine point eight million", "nineteen seventy-eight") so the TTS reads them correctly. Short, punchy, spoken sentences.
  - The first segment's scene is `{"type":"globe"}`; its text ends with "This is <Country>." The last is `{"type":"outro"}` and asks viewers to subscribe and join the next country.
  - Scene types and fields:
    - `map`: `chapter`, `view` {lon, lat, span (visible degrees of longitude, about 2 to 2.5x the country width)}, optional `labels` [[name, lon, lat, "sea"?]], `markers` [[name, lon, lat, kind]] (kind: pin, dot, peak, star), `river` [[lon,lat]...] + `riverLabel`, `big` [["17","label"]] (right-hand number chips)
    - `stats`: like map plus `capital` [name, lon, lat] and `cards` [{label, value, suffix, fmt: int|1dp|2dp, note} or {label, text}]. Set the view lon about 0.15×span east of the country so it sits left of the panel.
    - `cities`: `view`, `cities` [[name, lon, lat]]
    - `timeline`: `events` [[year label, short text]] (3 to 5)
    - `cards`: `cards` [[icon, title, subtitle, cueWord?]] (icons: flamenco, clock, bull, tomato, flower, train, torii, bowl, mountain, star)
    - `bignum`: `value`, `fmt`, `suffix`, `label`, `note`, `chips` [], `cue` (spoken word that starts the count)
    - `bars`: `kpis` [{label, value, prefix, suffix, fmt, cue}] and `bars` {title, items [[label, value]], cue}, `note`
    - stats `cards` also take `cue` (the spoken word that reveals the card)
    - `steps` (tutorials): `chapter`, optional `url` (official site, shown in a browser bar, e.g. "sede.administracionespublicas.gob.es"), `steps` [[title, detail, cueWord?]] (3 to 6)
    - `checklist` (tutorials): `chapter`, `title`, `items` [[label, cueWord?]] (documents, requirements)
  - A `cue` is the first spoken word of a phrase in that segment's text (e.g. "forty-two", "census"). Elements appear when it's spoken; without one they are staggered.
  - Labels and markers appear when their first word is spoken, so use the exact spoken name.
- Check the map coordinates. Render previews before pushing if you can: `python pipeline/prepare.py` needs `build/timing.json`, so usually just push and check the stills from the finished video.

## After the render
1. Wait for `status.json` to show `success`, then download the MP4 and look at 6 to 9 frames (ffmpeg tile) to check the layout.
2. Publishing: Hossein wants fully automatic publishing. If his YouTube channel is connected in **Metricool** (`getBrandSettings`), schedule it with `createScheduledPost` and `autoPublish: true` (public, category TRAVEL_EVENTS, madeForKids false, media = release asset URL). Otherwise use the vidIQ connector: `vidiq_video_upload` and then `vidiq_social_post_draft_create`. A vidIQ draft is published only after Hossein approves it. Title: English, under 70 chars, includes the country. Description: summary, chapters with timestamps (`status.json` has a ready `chapters` list), sources and #hashtags. Always message him in Persian with the result.
