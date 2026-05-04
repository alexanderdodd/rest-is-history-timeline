# search

A command-palette-style search dialog for jumping to episodes by name or by year. Opened from a single sticky "Search & filter" trigger at the top of the page.

## What it does
- A thin sticky strip at the top hosts one trigger button (`🔍 Search & filter`). Clicking it (or pressing `/`) opens a centred native `<dialog>` containing the search input + the [filter controls](./filters.md).
- The dialog closes on Escape, on backdrop click, on the × button, or automatically when a search result is picked.
- Inside the dialog: search input at the top (auto-focused), search results render inline below it as the user types, filter controls live at the bottom and stay visible.
- Two query modes, auto-detected from the input:
  - **Year query**: `1789`, `44 BC`, `AD 800`, `1066`, `100 BCE`. Results sorted by closeness to that year (with a "year-in-range" preference for episodes whose `covers` actually contain it).
  - **Text query**: anything else. Substring match against episode title (preferred) and description (secondary).
- Up to 8 results in the inline list; each shows the episode title, the formatted date range, and what kind of match it was ("Year in range", "Closest year", "Title match", "Description match").
- Clicking (or Enter on) a result smooth-scrolls the matching episode card into view, centred, and briefly flashes its background so it's easy to spot.
- The trigger button shows a small accent badge with the count when any [filter](./filters.md) is active, so the user can tell at a glance that the timeline is being thinned.
- Keyboard:
  - `/` from anywhere on the page opens the dialog and focuses the input (skipped when typing into an existing input/textarea).
  - Arrow keys navigate the result list inside the dialog, Enter selects, Escape closes.

## Why
The timeline is long (hundreds of episodes spanning 5,000 years). Without a way to jump, the user has to scroll. The earlier always-docked search bar + filter row was visually heavy and worked the same whether the user wanted it or not. The dialog version reduces the toolbar footprint to a single button while keeping `/` as a one-keystroke summon — the search-led UX without permanently committing 90px of vertical space at the top of the page.

## How it works
- `components/Toolbar.tsx` owns the dialog open/close state, drives a native `<dialog>` imperatively (`showModal()` / `close()`), focuses the search input on open, and binds the `/` shortcut. The trigger button shows the active-filter count via `<TimelineApp>`'s state passed in.
- `components/SearchBar.tsx` renders the input + results list. It accepts an `onSelect` callback so the parent dialog can close itself when a result is picked. The internal `/` shortcut was removed (Toolbar owns it) — keeping it would have double-fired.
- `lib/search.ts` is pure: `parseYearQuery(query)` returns a year (negative for BC) or null, then `searchEpisodes(query, episodes)` returns up to 8 ranked `SearchResult`s with a `reason` tag.
- Navigation is DOM-based: `EpisodeCard` carries `data-timeline-id={episode.youtubeId}`. On select, the dialog closes and `document.querySelector('[data-timeline-id="…"]').scrollIntoView({ behavior: "smooth", block: "center" })` runs, with a brief `event-flash` class for the highlight animation.
- The bar receives the **filtered** episode set (post-filter), so a search result is guaranteed to correspond to a card actually rendered on the timeline — `scrollIntoView` won't silently fail.

## Non-obvious decisions / constraints
- **Native `<dialog>`, not a custom div + portal.** Gets us focus trap, Escape-to-close, `::backdrop` styling, and proper `role="dialog"` aria semantics for free. The only hand-rolled behaviour is backdrop-click-to-close (a `target === dialogRef.current` check on dialog click).
- **Backdrop-click-to-close uses event delegation, not refs**, because clicks on the inner content stop at that node — only direct clicks on the dialog itself bubble up as the backdrop.
- **Search input auto-focuses via `requestAnimationFrame`**, not synchronously. `showModal()` schedules layout, and focusing before the dialog has rendered would silently fail on some browsers.
- **Year parser is permissive but bounded**: accepts `1789`, `1789 ad`, `ad 1789`, `44 bc`, `bc 44`, `bce 100`, `100 ce`, plain integer including `-44`. Anything else falls through to text search.
- **No fuzzy matching library**: plain `String.includes` on lowercased title/description is enough at this scale. Title matches rank above description matches; year-in-range ranks above closest-year. If/when the corpus grows further, swap in `fuse.js`.
- **Search results inside the dialog are `position: static`, not absolute.** The default absolute popover would overflow the dialog awkwardly; inline placement keeps everything in one vertical scroll context.
- **`onSelect` from SearchBar fires AFTER the smooth-scroll request**, so the dialog closes immediately and the user sees the timeline scroll in to the result. If we closed before scroll, the freshly-painted timeline could steal focus mid-scroll.
- **Filter count badge on the trigger** (rendered when any filter is active) is the only "feature surface" outside the dialog. This makes "search & filter" discoverable without exploding the toolbar.

## Future hooks
- **Era filter chips** above the search input as quick-scope shortcuts (Ancient/Classical/…).
- **Recent / pinned searches** persisted in localStorage so a user with a favourite period can jump back without retyping.
- **Multi-select results** so the user can build a watchlist of episodes from one dialog session.
