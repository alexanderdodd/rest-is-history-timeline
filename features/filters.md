# filters

Three opt-in toggles inside the search-and-filter dialog (opened via the sticky "Search & filter" trigger or `/`). Persist across visits via localStorage. The trigger button shows a count badge when any filter is active so the user can see at a glance that the timeline is being thinned.

## What it does

Three filters, all client-side, all combinable:

- **Tom and Dominic only (no guests)** (checkbox) — hides episodes where a guest features prominently. Pure Tom + Dominic only.
- **Series only** (checkbox) — hides one-off episodes. Only multi-part series episodes (French Revolution, Caligula, etc.) remain.
- **Published after** (date input) — hides episodes whose YouTube `publishedAt` is strictly before the selected date. Skips the older episodes when production values were less polished, with no fiddly numeric thresholds.

Filters are remembered per-browser in `localStorage["trih-timeline-filters"]` so they stick across visits. Clear it (or use a different browser) to reset.

When a filter empties out a year row entirely, the row vanishes — no orphan year labels with no cards. SearchBar respects the same filtered set so a result you click is guaranteed to be on the rendered timeline (otherwise `scrollIntoView` would silently fail).

## Why

Browsing the full ~600-episode timeline is overwhelming, and the user has different shapes of "what I want to watch":

- Pure-hosts mode for when you want the show's signature dynamic, not a guest interview.
- Series-only for "I want to commit to a deep dive arc, not a one-off curiosity".
- Numbered-threshold for skipping the older, lower-quality early episodes — the show's production values and run-time conventions stabilised somewhere in the low hundreds, so chopping the early numbered standalones is a quality-control shortcut.

The three are orthogonal and combinable. Setting all three gives you the high-quality recent series-only Tom-and-Dominic feed.

## How it works

- **`components/TimelineApp.tsx`** is the top-level client component. Owns filter state via `useState`; renders the `<Toolbar />` (which itself contains the trigger button + the dialog with `<SearchBar />` and `<FilterPanel />` inside), the `<Timeline />`, and the `<ScrollDepthTracker />`.
  - On mount, hydrates from `localStorage["trih-timeline-filters"]` via `useEffect`. We deliberately don't initialise from localStorage in `useState` because that would cause a server/client hydration mismatch — server has no localStorage so it always renders DEFAULT_FILTERS, and a client with saved filters would render a different tree.
  - On every filter change, persists back to localStorage in another `useEffect` (gated on the `hydrated` flag so the first load's setState from localStorage doesn't immediately re-write the same value).
  - Filters apply to (a) the rows passed to `<Timeline />` and (b) the episodes passed to `<SearchBar />`. A row that has no surviving episodes is dropped entirely; event rows always pass through.
  - `<SeriesConnectors />` is keyed on a string derived from the filter state, so when filters change it remounts and the SVG paths recompute against the new DOM.
- **`components/FilterPanel.tsx`** is the controlled UI: three checkbox/number inputs that call `onChange` with the next `Filters` value.
- **`lib/episodes-loader.ts`** computes `episodeNumber` from the title at load time via a regex (`/^\s*(\d+)\.\s/`). It's deterministic — no need to persist on the index.
- **`lib/sync/types.ts` + `lib/sync/classify.ts`** populate `hostsOnly` (added in v8). The classifier defaults to `true` when it can't tell, since the show is hosts-only by default. Pre-v8 entries (no `hostsOnly` field) are also treated as `true` by the filter logic (`ep.hostsOnly === false` is the only signal for "guest"; missing means hosts-only).
- **`app/page.tsx`** stays a server component: loads the index, builds the `Row[]`, and hands both the rows and the flat `PositionedEpisode[]` to `<TimelineApp />`.

## Non-obvious decisions / constraints

- **`publishedAfter` uses lexicographic string comparison** rather than `new Date()` parsing. Both values are ISO-shaped (`YYYY-MM-DDTHH:MM:SSZ` for `publishedAt`, `YYYY-MM-DD` for the filter), so `ep.publishedAt < f.publishedAfter` is correct for "published before midnight UTC on the filter date". An episode published exactly on the filter date passes (its T-prefixed time is greater than the bare date string).
- **An earlier `min episode number` filter was replaced by `publishedAfter`.** The old filter operated on a regex-extracted leading number from the title (e.g. `232. The Loch Ness Monster`) and was strict — also hiding unnumbered episodes when active. It worked but the publish date is the more obvious "filter out the older stuff" lever and applies uniformly across numbered and unnumbered episodes.
- **Filter state in localStorage, not URL params.** The site is single-page and the user iterates by reloading; durability matters more than shareability. Switching to `useSearchParams` is a one-liner if we ever need shareable filter URLs.
- **Hydration-safe initialisation.** `useState(DEFAULT_FILTERS)` then `useEffect` to load saved filters. The brief flash of "all-off" on first paint before the saved state kicks in is acceptable; the alternative (lazy initialiser reading localStorage) breaks hydration.
- **`hostsOnly: undefined` is treated as `true`.** Episodes classified before v8 don't have the field. Treating missing as "hosts-only" matches the show's default; the alternative (hide them as if guest-flagged) would silently nuke most of the timeline pre-resync.
- **SearchBar receives the FILTERED set**, not all episodes. This keeps search consistent with what's rendered: a click on a search result will always find a card in the DOM. If the user wants to find a hidden episode, they unfilter first.
- **The only thing always docked is the trigger button**, not the filter UI itself. The previous always-visible toolbar took ~90px of vertical space on every page; collapsing search and filters into a dialog reclaims that for the timeline. See [features/search.md](./search.md) for the dialog's dialogue plumbing.
- **Filter changes remount `<SeriesConnectors />` via a `key` prop.** The connectors compute SVG paths from DOM measurement; without the remount they'd retain stale geometry until the next ResizeObserver fire.
