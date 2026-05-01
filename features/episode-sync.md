# episode-sync

Catalogues YouTube episodes of *The Rest Is History*, classifies what historical period each one covers, and persists the result so the timeline page can surface relevant episodes against curated events.

## What it does
- Fetches every video uploaded to the channel (`@restishistorypod`) via the YouTube Data API v3.
- Filters out shorts and trailers (duration < 20 min, "trailer" in title).
- For each new episode, asks an LLM to classify which historical period(s) it discusses and which of our curated events from `lib/data/events.ts` it's materially about.
- Writes the resulting index to **Vercel Blob** (`episodes/index.json`, public-read).
- The Next.js page reads that index server-side, joins it onto our event list, and assigns the highest-confidence episode's YouTube thumbnail as the event's cover image.
- Keeps itself up to date via a **weekly Vercel cron** (`Mon 06:00 UTC`) — only newly seen videos are re-classified.
- A human-edited `data/episode-overrides.json` wins over the LLM's output for any video, including a `"skip": true` to remove an episode entirely.

## Why
Without this, the timeline is just a static "facts you already know" page. The whole point is being able to scrub to a period and see *which episodes the show actually has on it* — including the YouTube thumbnail as a visual anchor. Doing this preprocessing keeps the page render fast (no API calls at request time) and the classifier costs predictable (~$1 for the full backfill; near-zero for weekly increments).

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
- **Weekly cron**: `app/api/sync-episodes/route.ts`, scheduled by `vercel.json`. Auth-gated by `CRON_SECRET` (Vercel injects this automatically when a `crons` entry exists). Typical run classifies 1–3 new episodes.

### Page consumption
- `lib/episodes-loader.ts` is a `server-only` module that lists the Blob, fetches the JSON with `next: { revalidate: 3600 }`, and joins episodes onto events via `attachEpisodes`. Match priority: explicit `eventIds` → `covers` range containing the year. Among matches: confidence > explicitness > recency.
- `app/page.tsx` calls it and passes the joined `EventWithEpisodes[]` to `Timeline`.
- `Timeline` reads `event.primaryEpisode` for cover image + URL, mentions extra episode count in the subtitle.

## Non-obvious decisions / constraints
- **Haiku 4.5 over OpenRouter**, not the Anthropic SDK, because the user wanted a single OpenRouter key. We use the `openai` npm package with `baseURL: "https://openrouter.ai/api/v1"` — OpenRouter's endpoint is OpenAI-compatible. Model id: `anthropic/claude-haiku-4.5`.
- **No structured-output / tool-use mode**: OpenRouter's structured-output support across providers is uneven, so we prompt for strict JSON and parse it ourselves with two retries + a safe fallback (`covers: [], confidence: "low"`). Cheaper and more portable than chasing JSON-mode quirks per model.
- **`CLASSIFIER_VERSION` is the cache key**: bumping it (in `lib/sync/classify.ts`) invalidates *every* prior classification on the next run. Bump it whenever the prompt or output schema changes.
- **Series detection** (added `2026-05-01.v3`): the classifier also extracts `series: { name, partNumber, totalParts? }` for episodes that are part of a numbered series. Two purposes: (1) sort multi-part series in narrative order within a year row, (2) fix anchoring — the prompt explicitly tells the LLM to anchor `covers` to *this part's* chronological scope rather than the broader topic of the series. Without that, episodes like "Why Marie Antoinette became hated (Part 1)" got 1789–1799 from the LLM (the climax) and ended up plotted *after* "The Diamond Necklace Scandal (Part 2)" at 1785.
- **Initial backfill must be local**: Vercel cron caps at 60s (Hobby) / 300s (Pro). Even at 4-way concurrency, ~600 LLM calls don't fit. The cron route is built for the steady state (1–3 new episodes/week) and should rarely break a few seconds.
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
