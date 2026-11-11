---
name: "youtube-agent"
description: "YouTube agent with 11 commands (/yt-script, hook, title, thumbnail, edit, comment, plan, viral, seo, package, analytics) for Zoom World Travel videos."
---

# YouTube Agent (Zoom World Travel)

One skill, 11 commands. The user (Hossein) types a command like `/yt-title Japan history` or just asks in Persian ("عنوان بده برای…"). Reply to him in Persian; everything that goes on YouTube (script, title, description, tags, comments) is in English. The channel is Zoom World Travel (@zoomworldtravel): motion-graphics videos about countries, world history and travel for a worldwide audience, fully automated by the GitHub repo applay101/world-countries-motion (its CLAUDE.md holds the script.json schema, scene types, variety, energy and growth rules: follow it whenever you write a script or package).

General rules for every command:
- Facts and numbers only from sources you just checked (official statistics, UN, World Bank, IMF, UNESCO, reputable news). Never invent quotes or numbers.
- World-scale topics first; neutral on politics; nothing graphic.
- Title, thumbnail and first 5 seconds must promise the same thing, and the video must deliver it.
- Prefer proven formats: "The ENTIRE History of X in N Minutes", "X: Every Year (year–year)" map timelapse, "The ONLY countries where…", "POV: you were there when…", countdowns (#5→#1), "Why…", "X vs Y", tutorials from official sources.

## /yt-script <topic>
Write the full narration as episodes/<id>/script.json per the repo CLAUDE.md: 570–650 words (history: 1,300–1,600), numbers and years as words, segment 0 = hook, segment 1 = a map with ≥3 spoken markers, ≥5 map/cities scenes, no two panels in a row, emoji `pops`, other countries named so they light up with their flags. Show Hossein a 3-line Persian summary, not the whole JSON.

## /yt-hook <topic>
Give 5 opening lines (12–20 words each) built on a surprising number, a direct question or a sharp contrast. Mark the strongest and give its `hook` scene `lines` ([[DISPLAY TEXT, cueWord]], numbers as digits, last line = the country).

## /yt-title <topic>
Give 10 titles under 60 characters, main keyword first, with a number, time span in brackets or a specific promise. Score each 1–10 for curiosity and search, recommend one. No clickbait the video can't deliver.

## /yt-thumbnail <topic>
Pick one of the 10 engine styles (classic, split, bignum, question, versus, flagfull, rank, spotlight, steps, headline), different from the last 3 episodes, and output the `thumb` object: top (1–2 words), big (1–2 words), sub (≤3 words, one line), badge (one true striking number), emoji (fluent-emoji-flat:…), plus style extras. Explain the idea in one Persian line.

## /yt-edit <episode id or video>
Review a finished video (frames sheet from the MP4, or the script): pacing (3–5 s per visual beat), the first 30 s, dead spots, overlapping text, missing countries/flags, counters showing 0, weak transitions. List concrete fixes as script.json changes.

## /yt-comment <video>
Draft short, friendly English replies to comments (factual, no links, no promises, never argue; skip spam), and one pinned comment that asks a specific question or links the related video. Post only if Hossein says so or the automation rules allow it.

## /yt-plan [days]
Build a publishing plan (default 7 days × 5 videos + their Shorts): topic, format, opening, thumbnail style, publish time (Europe/Madrid), with variety across days. Offer to write it into ideas.md (unchecked lines, tutorials tagged [tutorial]).

## /yt-viral <niche or topic>
Find breakout videos (views far above their channel's normal) in the niche with web search or vidIQ outliers only if Hossein allows the credits (vidIQ credits are reserved for thumbnails). Extract the repeatable pattern (title formula, hook, format, length, thumbnail) and turn it into 5 episode ideas for this channel.

## /yt-seo <video or topic>
Keywords people actually search, the description (first 2 lines with keywords, "▶ Watch next" link, chapters, key facts, sources, exactly 3 hashtags) and 10–15 tags starting with the title keywords.

## /yt-package <topic or episode id>
Everything for upload in one go: final title, thumbnail object, description with chapters (from episodes/<id>/status.json when the video exists), tags, category (TRAVEL_EVENTS or EDUCATION), Short title + text + first comment, and the publish time. If the video is rendered, publish with Metricool (autoPublish, thumbnail URL, Short 3 hours later) as the repo CLAUDE.md describes.

## /yt-analytics [period]
Pull numbers from Metricool analytics (free) for the channel: views, watch time, subscribers, best and worst videos and Shorts of the period. Explain in Persian what worked (format, hook, thumbnail style, topic) and add 2 follow-up ideas on the best performer to the top of ideas.md.