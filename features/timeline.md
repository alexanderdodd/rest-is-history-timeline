# timeline

The single-page, vertically-alternating timeline that anchors this app. Hand-rolled — no third-party timeline library.

## What it does
- Renders **every classified podcast episode** (~400+) as its own card on the timeline, plotted at the **start year of the episode's first covers range** so you can scroll through history and see the show's coverage of each period.
- **Episodes that share a start year are grouped onto one row** — the year label appears once, and all episodes for that year stack on the same side of the spine. When a group has more than one episode, the cards switch to a compact horizontal layout (small thumbnail beside title + date) to save vertical space.
- Group rows alternate left/right of a central spine by group index; the page scrolls top-to-bottom from oldest covered period to most recent.
- Each card shows the episode's YouTube thumbnail, title (linked to YouTube), the date range it covers, and a short summary truncated from the YouTube description.
- The thumbnail and title both link straight to the episode on YouTube. Single-click, opens in a new tab.
- Date label next to the spine shows the start year, alternating opposite to the card.
- Mobile collapses to a single column with the spine on the left.
- **Curated historical events appear as context anchors** between episode rows — small, no thumbnail, accent stripe. They orient the reader chronologically (e.g. "First World War begins", "Fall of the Berlin Wall") without competing with the show's content.
- The timeline is the only thing on the page below the docked search bar — no header, no nav.

## Why
The whole point of this app is "scrub to a period and see the show's episodes about it." The earlier design had curated historical events as the primary cards, with episodes nested inside them — but that put the show's content one click away and forced the classifier to assign each episode to an event-shaped bucket. Episodes-per-card flips the relationship: the show's episodes *are* the timeline; curated events are reference-only data the classifier can use for `eventIds` matching.

## How it works
- **Architecture is split deliberately** into presentation and content:
  - `components/Timeline.tsx` is **content-agnostic**. It exports a `TimelineItem` type (`{ id, dateLabel, content }`) and renders the spine, dots, dates, and alternating card slots. It doesn't know about episodes, doesn't render `.ct-card` itself, and doesn't put `data-timeline-id` on the row — the content is responsible for its own card markup.
  - `components/EpisodeCard.tsx` owns the `<article class="ct-card">` wrapper plus its own `data-timeline-id` (the episode's `youtubeId`), so search-bar jumps land on the specific episode rather than the year row. Has a `compact` prop for the horizontal mini-card layout.
  - `app/page.tsx` composes them: groups episodes by `timelineYear`, maps each `EpisodeGroup` → `TimelineItem`, and passes a `<div class="ct-episode-stack">` of `<EpisodeCard compact={group.episodes.length > 1}>` as `content`.
- **Position rule**: `lib/episodes-loader.ts` `timelinePosition()` returns `episode.covers[0].startYear`. We anchor at the start of the covered period (rather than the midpoint) because it's usually closer to "what the episode opens on" and dodges the broad-range midpoint-junk problem (an episode covering 1500–2000 would otherwise plot at 1750).
- **Grouping rule**: `groupEpisodesByYear` buckets episodes by `timelineYear`. One row per bucket, side picked by group index. Episodes with empty `covers` don't get bucketed at all (they're filtered upstream).
- **No-anchor episodes are excluded**: episodes with empty `covers` (the classifier's "no temporal anchor" verdict, e.g. host chat / methodology episodes) don't appear on the timeline.
- **Sort**: groups by `year` ascending. Within a group, episodes sort by `(series.name, series.partNumber)` first so multi-part series read in narrative order; standalone episodes (no `series`) come after, ordered by `publishedAt`.
- **Series badge**: when an episode has a `series` field from the classifier, a small uppercase badge appears above the title ("The French Revolution · Part 2 of 5"). Each series gets a deterministic colour from a hash of its name.
- **Cross-year series connectors**: `components/SeriesConnectors.tsx` is an SVG overlay rendered inside the Timeline via the `overlay` slot. It measures every `[data-series-id]` card on mount/resize/image-load, groups by series id, sorts by part number, and draws a cubic Bezier curve from the inner edge of part N's bottom to the inner edge of part N+1's top, with control points pulling through the spine. Each series uses its deterministic colour so overlapping series stay distinguishable. The Timeline component itself stays content-agnostic — it just makes room for the overlay.
- Layout is a 3-column CSS grid per row (`1fr 96px 1fr`). The card slot lands in column 1 or 3 depending on whether the row is `ct-left` or `ct-right` (decided by index parity in the Timeline component). The marker column hosts the dot and the date label, with the date absolutely positioned so it sits opposite the card.
- Each row carries `data-timeline-id={item.id}` so external code (the search bar) can locate it via `querySelector` and `scrollIntoView`. The Timeline doesn't know what the id means; we happen to use the `youtubeId` of each episode.
- BC dates are stored as negative `year` numbers in covers; `lib/dates.ts` formats them ("3000 BC", "AD 800", "1789") and the formatted string is passed to the Timeline as `dateLabel` — the Timeline never parses it.

## Non-obvious decisions / constraints
- **Curated events still exist as data** (`lib/data/events.ts`) and are passed into the classifier prompt so episodes can match by `eventIds`. They're just not rendered. If we later want event anchors back, they'd be a different content component sharing the same Timeline.
- **One episode = one card**, even when an episode covers a long range. Multi-cover episodes still anchor at `covers[0].startYear`. If/when we want multi-position rendering (e.g. episodes appearing twice in different eras), that's a small tweak in the page composer.
- **`data-timeline-id` is the youtubeId here**, but the Timeline doesn't enforce that — any unique string works. Keeps Timeline.tsx domain-free.
- **Lazy `<img>` loading**: with hundreds of cards each carrying a thumbnail, `loading="lazy"` lets the browser defer below-the-fold loads.
- **Mobile breakpoint at 800px** collapses to single column with spine pinned to the left and the date label inline next to the dot.
- **No image domain whitelist needed**: we use plain `<img>` tags, not `next/image`, so `next.config.mjs`'s `remotePatterns` is unused for the timeline.

## Data quality knobs (when episodes plot in surprising places)
- The covers ranges come from the LLM classifier in `lib/sync/classify.ts`. If an episode plots somewhere clearly wrong (broad range, off-by-decade, etc.), correct it via `data/episode-overrides.json` keyed by `youtubeId`. Overrides win over the LLM's output and survive re-syncs without a `CLASSIFIER_VERSION` bump.
- If the classifier consistently mis-anchors a category of episode, refine the system prompt in `classify.ts` and bump `CLASSIFIER_VERSION` to force re-classification.
