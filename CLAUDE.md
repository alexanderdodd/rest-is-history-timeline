# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page web app that renders a visual, scrubbable timeline of human history (3000 BC → present), styled magazine-infographic. Episodes from *The Rest Is History* podcast are overlaid onto the timeline so that scrubbing to a period surfaces the relevant episodes (with their YouTube thumbnails as cover images). The episode index is built by a preprocessing pipeline (YouTube Data API → LLM classifier → Vercel Blob) and refreshed weekly by a Vercel cron — see `features/episode-sync.md`.

Deploy target: **Vercel**.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**.
- **`react-chrono`** for the timeline — currently `VERTICAL_ALTERNATING` mode (cards alternating left/right of a central spine, scroll vertically through history).
- Styling is plain CSS (`app/globals.css`); no Tailwind/CSS modules.

Why this stack: the user wants Vercel deployment (Next.js native), a visually rich timeline with images per event (`react-chrono`'s alternating mode is a strong match), and a single-page app surface (no chrome, timeline only).

## Common commands

- `npm run dev` — Next.js dev server with Turbopack (port 3000).
- `npm run build` — production build.
- `npm run start` — serve the production build locally.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` — `next lint`.
- `npm run sync-episodes` — local CLI that runs the episode-sync pipeline (fetch YouTube → classify via Haiku → write to Vercel Blob). Use `--limit N` to smoke-test on the first N new videos. Run for the initial backfill; after that the Vercel cron handles weekly increments.

There is no test suite yet. If one is added, document the runner here.

## Architecture (the big picture)

- `app/layout.tsx` — root HTML shell; loads Inter + Fraunces from Google Fonts and an inline-SVG favicon. Renders `{children}` only — no header/nav/footer.
- `app/page.tsx` — server component, calls `loadEventsWithEpisodes()` and renders `<Timeline events={...} />`. ISR (`revalidate = 3600`) plus on-demand revalidation from the cron.
- `app/api/sync-episodes/route.ts` — Vercel cron entrypoint, weekly. Auth-gated by `CRON_SECRET`. Calls the orchestrator and `revalidatePath("/")`.
- `app/globals.css` — dark theme tokens (CSS variables), page-level layout, and **all `react-chrono` style overrides** (selector-based, including some `[class*="..."]` matchers because react-chrono uses styled-components with hashed class names).
- `components/Timeline.tsx` — `"use client"` wrapper around `react-chrono`'s `Chrono`. Takes `EventWithEpisodes[]`, maps to `TimelineItemModel`. **All card-shape decisions happen here.** Cover image is `event.imageUrl ?? primaryEpisode.thumbnailUrl`; the card's `url` links to the primary episode.
- `lib/data/types.ts` — shared types (`HistoricalEvent`, `Era`).
- `lib/data/events.ts` — curated historical events (id, year, optional month/day, era, description, optional `imageUrl`).
- `lib/data/eras.ts` — six era spans (Ancient → Contemporary). Used to colour-code and label cards via the `era` field on each event.
- `lib/sync/` — episode-sync pipeline. Read `features/episode-sync.md` for the full picture.
  - `youtube.ts` — paginated channel-uploads fetch + duration filter.
  - `classify.ts` — OpenRouter call (`anthropic/claude-haiku-4.5`), prompt, schema. Bumping `CLASSIFIER_VERSION` invalidates the cache.
  - `blob.ts` — read/write `episodes/index.json` to Vercel Blob (stable URL, public-read).
  - `run.ts` — orchestrator (diff → classify-new → merge → overrides → write).
  - `types.ts` — `ClassifiedEpisode`, `EpisodeIndex`, etc.
- `lib/episodes-loader.ts` — `server-only` loader. Lists the Blob, fetches the index, joins episodes onto events. Returns `null` gracefully when `BLOB_READ_WRITE_TOKEN` is absent (fresh local dev).
- `scripts/sync-episodes.ts` — local CLI for the one-time backfill and prompt iteration.
- `lib/dates.ts` — BC/AD-aware date helpers. **All date construction goes through `dateForYear()`** because `new Date(year, ...)` adds 1900 to year arguments 0–99. `formatYearLabel` (`3000 BC` / `AD 800` / `1789`) and `formatEventDate` are used to render the title strings on each timeline item.
- `data/episode-overrides.json` — human override layer keyed by `youtubeId`; wins over the LLM. Set `{ "skip": true }` to drop an episode.
- `vercel.json` — cron schedule (Mon 06:00 UTC).
- `types/react-chrono.d.ts` — module shim. `react-chrono` v2 ships its types at `dist/react-chrono.d.ts` but its `package.json` points `types` at the non-existent `dist/index.d.ts`. Until upstream fixes that, this shim exists.
- `next.config.mjs` — `images.remotePatterns` allows `i.ytimg.com` / `img.youtube.com` for YouTube thumbnails.

The `next-env.d.ts` and `tsconfig.json` files are partially managed by `next build` (it adds includes / sets `jsx: react-jsx`). Don't fight those edits.

## Standing rules

### Always commit and push

After completing a coherent unit of work — feature added, bug fixed, refactor done — **commit it and push to `origin/main`** as part of "done." Do not wait to be asked. The user is iterating fast and intends Vercel to watch the repo. Group changes into one logically coherent commit per turn, not micro-commits or one giant blob. Same git safety rules as ever (no `--force`, no `--no-verify`, don't commit secrets, no `git add -A` blindly).

### Feature documentation convention (HARD RULE)

Every feature in this repo must have a corresponding markdown file at `features/<feature-name>.md`. Not optional.

- Create the file in the same change that introduces the feature.
- `<feature-name>` should be `kebab-case` and match how the feature is referred to in code/UI where reasonable.
- Each feature file should cover: what the feature does, why it exists, how it works at a high level, and any non-obvious decisions or constraints.
- When a feature is materially changed, update its file in the same change. When a feature is removed, delete the file.
- If you are asked to "build X" and no `features/x.md` exists, create it as part of the work. If one exists, read it first — it is the source of truth for intent.

Existing feature docs:
- `features/timeline.md` — the core timeline.
- `features/episode-sync.md` — the YouTube → LLM → Blob preprocessing pipeline + Vercel cron that keeps it current.
