# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page web app that renders a visual, scrubbable timeline of human history (3000 BC → present), styled magazine-infographic. The longer-term plan is to overlay episodes from *The Rest Is History* podcast onto the timeline so that scrubbing to a period surfaces the relevant episodes (with their YouTube thumbnails as cover images). Episode mapping is plumbed but unpopulated.

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

There is no test suite yet. If one is added, document the runner here.

## Architecture (the big picture)

- `app/layout.tsx` — root HTML shell; loads Inter + Fraunces from Google Fonts and an inline-SVG favicon. Renders `{children}` only — no header/nav/footer.
- `app/page.tsx` — server component, just renders `<Timeline />`.
- `app/globals.css` — dark theme tokens (CSS variables), page-level layout, and **all `react-chrono` style overrides** (selector-based, including some `[class*="..."]` matchers because react-chrono uses styled-components with hashed class names).
- `components/Timeline.tsx` — `"use client"` wrapper around `react-chrono`'s `Chrono`. Maps `HistoricalEvent[]` → its `TimelineItemModel` shape, applies the dark `theme`, and sets `mode`. **All event data shaping happens here.** If you add fields to `HistoricalEvent`, update `toChronoItem` here too.
- `lib/data/types.ts` — shared types (`HistoricalEvent`, `Era`, `Episode`).
- `lib/data/events.ts` — curated historical events (id, year, optional month/day, era, description, optional `imageUrl`).
- `lib/data/eras.ts` — six era spans (Ancient → Contemporary). Used to colour-code and label cards via the `era` field on each event.
- `lib/data/episodes.ts` — placeholder for podcast-episode index. Empty today; `Episode.covers` ranges and/or `eventIds` are how an episode attaches to events. `youtubeId` will derive thumbnail URLs (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`) — the `imageUrl` on `HistoricalEvent` is intended to receive these.
- `lib/dates.ts` — BC/AD-aware date helpers. **All date construction goes through `dateForYear()`** because `new Date(year, ...)` adds 1900 to year arguments 0–99. `formatYearLabel` (`3000 BC` / `AD 800` / `1789`) and `formatEventDate` are used to render the title strings on each timeline item.
- `types/react-chrono.d.ts` — module shim. `react-chrono` v2 ships its types at `dist/react-chrono.d.ts` but its `package.json` points `types` at the non-existent `dist/index.d.ts`. Until upstream fixes that, this shim exists.
- `next.config.mjs` — `images.remotePatterns` allows `i.ytimg.com` / `img.youtube.com` for the upcoming YouTube-thumbnail integration.

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
