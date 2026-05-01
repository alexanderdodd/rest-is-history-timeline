# timeline

The single-page, vertically-alternating timeline that anchors this app. Hand-rolled — no third-party timeline library.

## What it does
- Renders ~50 curated major world-history events from **3000 BC → present** as cards alternating left/right of a central spine; the page scrolls top-to-bottom through history.
- Each card shows the event's title, era pill, episode count, description, the primary episode's YouTube thumbnail (cover image), and a **clickable list of every matching episode** with a 2-line summary so the user can pick which one to watch.
- The thumbnail and the title both link to the primary episode; each episode in the list is its own link to YouTube.
- Date labels render next to the spine, alternating opposite to the card.
- Mobile collapses to a single column with the spine on the left.
- The timeline is the **only** thing on the page below the docked search bar — no header, no nav, no side panel.

## Why
Centrepiece of the app. Everything hangs off it: scrubbing to a period and surfacing every relevant episode there is the whole point. We replaced react-chrono with a custom build because the library kept fighting us — the children pattern didn't render in v2.9, scroll events were trapped, the toolbar was light-themed, and per-episode click-through wasn't possible. Owning the rendering removes a long tail of friction.

## How it works
- **Architecture is split deliberately** into presentation and content:
  - `components/Timeline.tsx` is **content-agnostic**. It exports a `TimelineItem` type (`{ id, dateLabel, content }`) and renders the spine, dots, dates, and alternating card slots. It knows nothing about events or episodes.
  - `components/EventCard.tsx` is the **content** for our domain — given an `EventWithEpisodes`, it renders the cover, title, era, description, and the full episode list.
  - `app/page.tsx` composes them: maps `events` → `TimelineItem[]` with `content: <EventCard event={e} />`.
- Layout is a 3-column CSS grid per row (`1fr 96px 1fr`). The card slot lands in column 1 or 3 depending on whether the row is `ct-left` or `ct-right` (decided by index parity in the Timeline component). The marker column hosts the dot and the date label, with the date absolutely positioned so it sits opposite the card.
- The spine is a single absolutely-positioned `.ct-spine` div down the middle, behind the rows.
- Each row carries `data-timeline-id={item.id}` so external code (the search bar) can locate it via `querySelector` and `scrollIntoView`. The Timeline doesn't know what the id means; the search bar happens to use event ids because that's what callers pass.
- Episode lists scroll internally past 420px so very busy events (the French Revolution has ~40 episodes) don't blow the card out of proportion.
- BC dates are stored as negative `year` numbers in events; `lib/dates.ts` formats them ("3000 BC", "AD 800", "1789") and the formatted string is passed to the Timeline as `dateLabel` — the Timeline never parses it.

## Non-obvious decisions / constraints
- **Timeline is generic by design**: presentation logic stays in `Timeline.tsx`, content logic in `EventCard.tsx`. Adding a new content type later (e.g. a `BookCard` for book-launch episodes) is a new content component, no Timeline changes.
- **Why we dropped react-chrono**: in v2.9.1 the documented `children` pattern doesn't actually render content — only the cover image came through, no `cardTitle` and no children. We tried CSS overrides, the `slot` API, and re-ordering items first; none worked. Rolling our own (~200 lines) ended up shorter than the workarounds and gave us per-episode clickability for free.
- **Card width is capped at 460px** even though the slot can be wider, so cards don't grow uncomfortably on big screens. The slot's `justify-content` (flex-end on the left side, flex-start on the right) keeps cards visually anchored toward the spine.
- **Mobile breakpoint at 800px** collapses to single column with spine pinned to the left and the date label inline next to the dot. Both `.ct-left` and `.ct-right` rows render the same way at that width.
- **Lazy `<img>` loading**: the page has 50 cards each with a thumbnail; `loading="lazy"` lets the browser defer below-the-fold loads.
- **No image domain whitelist needed**: we use plain `<img>` tags, not `next/image`, so `next.config.mjs`'s `remotePatterns` is unused for the timeline (still useful if/when we move to optimised images).
