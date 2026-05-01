# episode-sync

Catalogues YouTube episodes of *The Rest Is History*, classifies what historical period each one covers, and persists the result so the timeline page can surface relevant episodes against curated events.

## What it does
- Fetches every video uploaded to the channel (`@restishistorypod`) via the YouTube Data API v3.
- Filters out shorts and trailers (duration < 20 min, "trailer" in title).
- For each new episode, asks an LLM to classify which historical period(s) it discusses and which of our curated events from `lib/data/events.ts` it's materially about.
- Writes the resulting index to **Vercel Blob** (`episodes/index.json`, public-read).
- The Next.js page reads that index server-side, joins it onto our event list, and assigns the highest-confidence episode's YouTube thumbnail as the event's cover image.
- Keeps itself up to date via a **monthly Vercel cron** (`1st of each month, 06:00 UTC`) — only newly seen videos are re-classified.
- A human-edited `data/episode-overrides.json` wins over the LLM's output for any video, including a `"skip": true` to remove an episode entirely.

## Why
Without this, the timeline is just a static "facts you already know" page. The whole point is being able to scrub to a period and see *which episodes the show actually has on it* — including the YouTube thumbnail as a visual anchor. Doing this preprocessing keeps the page render fast (no API calls at request time) and the classifier costs predictable (~$1 for the full backfill; near-zero for monthly increments).

## How it works

### Pipeline (orchestrated in `lib/sync/run.ts`)
1. Resolve the channel handle → uploads playlist (`youtube.ts`, one extra call on first run).
2. Paginate the uploads playlist; combine with `videos.list` for durations.
3. Filter to "likely episodes" by duration + title heuristics.
4. Load the existing index from Blob; bucket each episode into:
   - **Reused**: existing entry with current `CLASSIFIER_VERSION` — left untouched.
   - **To classify**: new, OR existing with stale `classifierVersion`.
5. Classify the bucket via OpenRouter → Haiku 4.5 (concurrency 4). Each call returns `{ covers: [{startYear, endYear}], eventIds: [], confidence }`. BC years are negative integers.
6. Apply `data/episode-overrides.json` on top; drop any with `skip: true`.
7. Sort newest-first; write to Blob; (when called from cron) `revalidatePath("/")`.

### Where it runs
- **Local backfill**: `npm run sync-episodes`. Loads `.env.local`, runs the orchestrator with progress logging. **Run this once** for the initial ~600-episode backfill — it would never finish inside Vercel's cron timeout.
- **Monthly cron**: `app/api/sync-episodes/route.ts`, scheduled by `vercel.json` (`0 6 1 * *` — 06:00 UTC on the 1st of every month). Auth-gated by `CRON_SECRET` (Vercel injects this automatically when a `crons` entry exists). Typical run classifies 4–12 new episodes — well within Pro's 300s cap at 4-way concurrency.

### Page consumption
- `lib/episodes-loader.ts` is a `server-only` module that lists the Blob, fetches the JSON with `next: { revalidate: 3600 }`, and joins episodes onto events via `attachEpisodes`. Match priority: explicit `eventIds` → `covers` range containing the year. Among matches: confidence > explicitness > recency.
- `app/page.tsx` calls it and passes the joined `EventWithEpisodes[]` to `Timeline`.
- `Timeline` reads `event.primaryEpisode` for cover image + URL, mentions extra episode count in the subtitle.

## Non-obvious decisions / constraints
- **Haiku 4.5 over OpenRouter**, not the Anthropic SDK, because the user wanted a single OpenRouter key. We use the `openai` npm package with `baseURL: "https://openrouter.ai/api/v1"` — OpenRouter's endpoint is OpenAI-compatible. Model id: `anthropic/claude-haiku-4.5`.
- **No structured-output / tool-use mode**: OpenRouter's structured-output support across providers is uneven, so we prompt for strict JSON and parse it ourselves with two retries + a safe fallback (`covers: [], confidence: "low"`). Cheaper and more portable than chasing JSON-mode quirks per model.
- **`CLASSIFIER_VERSION` is the cache key**: bumping it (in `lib/sync/classify.ts`) invalidates *every* prior classification on the next run. Bump it whenever the prompt or output schema changes.
- **Series detection** (added `2026-05-01.v3`): the classifier extracts `series` for episodes that are part of a numbered series. Two purposes: (1) sort multi-part series in narrative order within a year row, (2) fix anchoring — the prompt explicitly tells the LLM to anchor `covers` to *this part's* chronological scope rather than the broader topic of the series.
- **Season-aware series naming + month/day precision + narrative anchoring** (added `2026-05-01.v4`): the v3 prompt allowed the LLM to be conservative about season identifiers — episodes like "The French Revolution S02E03" and "The French Revolution S03E02" were being lumped under one series name "The French Revolution", which broke ordering when 7 parts from 3 different seasons landed at year 1789. v4 prompt:
  - **Always** include the season in the series name when one is present in the title ("The French Revolution Season 2", "The French Revolution Season 3"). Different seasons are different series.
  - Anchor `startYear` to where THIS part's narrative actually unfolds (not background context references). Marie-Antoinette example baked into the prompt: anchor at 1770 / 1774 (her arrival in France / accession), not 1755 (her birth).
  - Optional `startMonth` / `startDay` / `endMonth` / `endDay` on covers — populated when the episode is about a specifically-dated event (Storming of the Bastille → 14 Jul 1789).
- **Topic / seriesNumber split for unified labels** (added `2026-05-01.v5`): v4 baked the season into the series `name` (e.g. "The French Revolution Season 2"), which produced confusing badges where one cluster said "Part 1 of 3" and another nearby cluster said "Part 4" — visually contradictory because the LLM was inconsistent about whether an unmarked episode belonged to "Season 1" or to a name-less standalone series. v5 splits the field into `topic` + `seriesNumber`:
  - `topic` is the canonical show name with ALL season/part markers stripped, identical across every season of the same show (e.g. "The French Revolution").
  - `seriesNumber` is the season index (1 when the title has no season indicator, 2 for "S02", etc.).
  - Display label: `${topic}: Series ${seriesNumber} - Part ${partNumber} of ${totalParts}` — e.g. "The French Revolution: Series 1 - Part 1 of 3", "The French Revolution: Series 2 - Part 4 of 6". Now the relationship between two badges is obvious.
  - `parseSeries()` accepts the legacy `name` field and treats it as `topic` so a partially-classified index doesn't crash before the next backfill — but `CLASSIFIER_VERSION` was bumped so everything gets re-classified anyway.
  - Within-year sort key now keys on `(topicSlug, seriesNumber, partNumber)` so multi-season clusters land in the right narrative order.
- **Per-part anchoring within broad series** (added `2026-05-01.v6`): v4–v5 already told the LLM to anchor each part at its own narrative, but it kept collapsing parts of decade-spanning series ("The 1970s", "The Wars of the Roses") to the series' start year — every part of "The 1970s" landed at 1970 regardless of subject. v6 adds a Wilson-resignation worked example to the prompt ("The Most Mysterious Resignation in British History | The 1970s EP 3" → anchor 1976, not 1970), an explicit "the SERIES SPAN is NEVER a substitute for the part's narrative" rule, and a "different parts typically have different startYears — if every part lands at the same year, you're using the series span and that's wrong" sanity check. Also nudges the LLM toward TIGHT covers ranges (1–3 years for a single-event episode) instead of spanning the whole series period.
- **Topic canonicalisation + tighter ranges for topical-era episodes** (added `2026-05-01.v7`): two French Revolution issues that survived v6:
  - **Topic mis-extraction for chapter-prefix titles**: "The Storming of the Bastille | French Revolution | Part 5" was producing topic = `"The Storming of the Bastille | French Revolution"` instead of `"The French Revolution"`, so it didn't cluster with parts 6 and 7. v6 examples only covered chapter-suffix patterns (`"<show> | Part N | <chapter>"`); v7 adds chapter-prefix patterns (`"<chapter> | <show> | Part N"`) and a heuristic ("the show name is the part that recurs across multiple episodes; the chapter title is unique to one") so the LLM strips chapters from either side.
  - **Topical-era over-bracketing**: "Guillotine: Symbol Of The Terror" was anchoring 1789 because the broader French Revolution started then, even though the guillotine wasn't used until 1792 and the episode is about the Terror (1793–94). "The Most Unexpected Revolutionary: <figure>" was anchoring 1789–1799, the entire Revolution. v7 adds two worked examples for "tight bracket the actual subject, don't bracket the whole topical era" — one for an event-tool (guillotine → 1792–94), one for a figure inside a larger movement (anchor at when they were prominent, not at the movement's start).
- **Topic-name normalisation in sort**: `episodes-loader.ts` uses a slugified comparison key when grouping series within a year, so "The French Revolution" and "French Revolution" cluster together regardless of LLM consistency.
- **Initial backfill must be local**: Vercel cron caps at 60s (Hobby) / 300s (Pro). Even at 4-way concurrency, ~600 LLM calls don't fit. The cron route is built for the steady state (4–12 new episodes/month — at ~2-3s per LLM call with 4-way concurrency, well under the 300s ceiling).
- **`addRandomSuffix: false` + `allowOverwrite: true`** on the Blob put — gives a stable URL across syncs so callers can cache it predictably. We still go via `list()` first because we don't know the public URL prefix until the first sync.
- **Description is truncated to 1500 chars** for the classifier and 500 chars in the persisted index. Most YouTube descriptions are boilerplate after the first paragraph (sponsor reads, signup links, social handles) — more bytes don't help classification.
- **`@vercel/blob`'s `list()` requires `BLOB_READ_WRITE_TOKEN`** even for public-read blobs. The page's loader returns `null` if the token is missing rather than crashing — useful for fresh local dev before the user has provisioned Blob.
- **The page revalidates hourly** as a fallback in case `revalidatePath` from the cron fails for any reason. Episode data that's an hour stale is fine.

## Required environment variables
- `YOUTUBE_API_KEY` — Google Cloud Console → YouTube Data API v3.
- `OPENROUTER_API_KEY` — https://openrouter.ai/keys.
- `BLOB_READ_WRITE_TOKEN` — auto-injected on Vercel when Blob is provisioned. Locally: copy from the Vercel dashboard.
- `CRON_SECRET` — Vercel auto-generates and injects this when a `crons` entry exists in `vercel.json`. The route refuses requests without `Authorization: Bearer <CRON_SECRET>`.

`.env.local` template (gitignored):
```
YOUTUBE_API_KEY=...
OPENROUTER_API_KEY=...
BLOB_READ_WRITE_TOKEN=...
```

## Running it
```bash
# Smoke test: fetch + classify just the first 5 new episodes.
npm run sync-episodes -- --limit 5

# Full backfill (~600 episodes, ~$1, ~5–15 minutes).
npm run sync-episodes
```

## Future hooks
- **Auto-captions / transcripts** as additional classifier context for episodes where the title+description is too thin (e.g. unnumbered Goalhanger pun episodes). yt-dlp can fetch these without a YouTube API key. Add only if classification recall disappoints.
- **Multi-episode display per event**: currently the timeline shows the primary episode and a counter. Could expand into a popover listing all matches.
- **Episode browser**: a `/episodes` route listing all classified episodes searchable by period. Same data, different lens.
