# timeline

The single-page, vertically-alternating timeline of human history that anchors this app.

## What it does
- Renders ~50 curated major world-history events from **3000 BC → present** as cards alternating left/right of a central spine.
- Scroll the page vertically to move through history (oldest at top → most recent at bottom).
- Each card shows: a tabular date (e.g. `15 Mar 44 BC`), the event title, an era subtitle (e.g. "Early Modern • 40 episodes"), and a short description. Events with a primary episode show that episode's YouTube thumbnail as the cover image.
- **All matching episodes are listed inside the card**, not just the primary. Each title is a clickable link to its YouTube video (new tab). The list scrolls internally if there are many (cap ~320px before scroll). Sorted: primary first, then by publish date.
- The thumbnail also links to the primary episode (event delegation in `Timeline.tsx`, because react-chrono renders `<img>` without URL binding). The header title links there too via react-chrono's per-item `url`.
- The timeline is the **only** thing on the page. No header, no nav, no side panel.

## Why
Centrepiece of the app. Everything else (podcast episode overlay, search, sharing, etc.) hangs off this. The whole point is being able to scrub to "the bit of history I'm curious about" and have rich content surface there.

## How it works
- Built on **`react-chrono`** (v2) in `mode="VERTICAL_ALTERNATING"`. Picked over `vis-timeline` (too plain, hard to make magazine-style) and TimelineJS3 (slideshow paradigm — wrong fit). The alternating-cards-on-a-spine pattern is `react-chrono`'s strongest look and matches the user's reference image in spirit (the reference is horizontal-alternating, but `react-chrono`'s horizontal mode is one-card-at-a-time, so we use vertical-alternating to keep all cards visible at once).
- `components/Timeline.tsx` is a `"use client"` component. It maps `HistoricalEvent[]` (from `lib/data/events.ts`) into `react-chrono`'s `TimelineItemModel` shape via `toChronoItem`, applies a dark theme via the `theme` prop, and sets stable `classNames` on every card piece so we can target them from CSS.
- Styling lives in `app/globals.css`. Because `react-chrono` uses styled-components with hashed class names, some overrides use `[class*="..."]` attribute selectors. They're a bit ugly but stable across versions.
- BC dates are stored as negative `year` numbers in events; `lib/dates.ts` formats them (`3000 BC`, `AD 800`, `1789`). `react-chrono` doesn't know about dates — it just renders `title` as a string — so the BC complications stay confined to our formatter.

## Non-obvious decisions / constraints
- **Why VERTICAL_ALTERNATING and not HORIZONTAL**: `react-chrono`'s horizontal mode shows one card at a time when you click a point on the strip. The reference image the user shared has all cards visible simultaneously. Vertical-alternating is the closest match in `react-chrono`. If horizontal-with-all-cards-visible turns out to be a hard requirement later, we'd switch to a custom D3 build — `react-chrono` won't bend that way.
- **`react-chrono` types are broken**: its `package.json` `types` field points at a non-existent file (`dist/index.d.ts`). The actual types are at `dist/react-chrono.d.ts`. We work around this with a small module shim at `types/react-chrono.d.ts`. Our wrapper is the type-discipline boundary.
- **CSS overrides are selector-soup**: `react-chrono` uses styled-components; many internal class names are hashed. We pin the ones we can via the `classNames` prop and target the rest with `[class*="..."]` matchers. Brittle but workable.
- **No SSR concerns**: `react-chrono` runs fine inside a `"use client"` component under the App Router. The page itself prerenders statically (`next build` reports `○ /` as `(Static)`).
- **Episode list rendered as react-chrono `children`, not `cardDetailedText`**: react-chrono's `cardDetailedText` is plain text only — no clickable links. Passing one React node per item via `children` lets us render a real `<ul>` of `<a>` tags. The trade-off is that `cardDetailedText` and `useReadMore` are unused; we control the body's height via `max-height` + internal scroll on `.rh-episodes-list`.
- **Thumbnail click via delegation, not anchor wrapping**: wrapping the rendered `<img>` in an `<a>` would mutate react-chrono's DOM tree mid-render. Instead, a single click handler on `.timeline-shell` matches the clicked image's `src` against a `Map<thumbnailUrl, episodeUrl>` and `window.open`s the URL. Native cmd-click / middle-click semantics are lost (a known cost), but reconciliation stays clean. The handler explicitly bails on `closest("a")` so the per-episode links inside the card aren't hijacked.
- **`scrollable={false}` on `<Chrono>`**: with the default `scrollable={true}`, react-chrono mounts an internal overflow container that traps wheel events when the cursor is over the timeline. We want the document to scroll instead — so `scrollable={false}` and let the page handle it.

## Future hooks (deliberately scaffolded)
- **YouTube thumbnails as event covers**: each `HistoricalEvent` already has an optional `imageUrl`. When `lib/data/episodes.ts` is populated, we'll resolve `episode.youtubeId` → `https://i.ytimg.com/vi/<id>/mqdefault.jpg` and assign that to the matching event's `imageUrl`. `next.config.mjs` already whitelists the YouTube image hosts.
- **Click-through to episode**: the `media` block on a `react-chrono` item supports a clickable image. Wire that up to the episode URL once episodes exist.
- **Episode source of truth**: longer-term, replace the static array with a generator that reads the show's RSS / YouTube feed.
