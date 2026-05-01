# search

A docked, sticky search bar at the top of the timeline page that jumps to events by name or by year.

## What it does
- Sticky bar at the very top of the page; visible while scrolling.
- Two query modes, auto-detected from the input:
  - **Year query**: `1789`, `44 BC`, `AD 800`, `1066`, `100 BCE`. Results sorted by closeness to that year.
  - **Text query**: anything else. Substring match against event title (preferred) and description (secondary).
- Up to 8 results in a dropdown directly under the bar; each shows the event title, the formatted date, the era pill, and what kind of match it was ("Exact year", "Closest year", "Title match", "Description match").
- Clicking (or Enter on) a result smooth-scrolls the matching event card into view, centred, and briefly flashes its background so it's easy to spot.
- Keyboard:
  - `/` from anywhere on the page focuses the input (avoiding inputs/textareas).
  - Arrow keys navigate the dropdown, Enter selects, Escape closes.
  - Click-outside closes the dropdown.

## Why
The timeline is long (~50 events spanning 5,000 years). Without a way to jump, the user has to scroll. The classic site-search ergonomic — a docked bar with `/` shortcut — is the cheapest way to make the timeline feel like a tool rather than an article.

## How it works
- `lib/search.ts` is pure: `parseYearQuery(query)` returns a year (negative for BC) or null, then `searchEvents(query, events)` returns up to 8 ranked `SearchResult`s. The two sort orders are: distance from the parsed year for year queries, and `(title-match-then-description-match, earliest-index-first)` for text queries.
- `components/SearchBar.tsx` is a `"use client"` component that owns the input, dropdown, and keyboard state. It calls `searchEvents` from a `useMemo` keyed on `(query, events)`.
- Navigation is DOM-based, not state-based: `EventCard` renders `data-event-id={event.id}` on its root. On select, the search bar runs `document.querySelector('[data-event-id="…"]').scrollIntoView({ behavior: "smooth", block: "center" })` and adds a temporary `event-flash` class for the highlight animation. This keeps the search bar fully decoupled from `Timeline` — it doesn't need a ref into react-chrono's internals.
- The bar lives directly inside `<main>` above `<Timeline>` so the sticky positioning anchors to the page, not to the timeline shell.

## Non-obvious decisions / constraints
- **Year parser is permissive but bounded**: accepts `1789`, `1789 ad`, `ad 1789`, `44 bc`, `bc 44`, `bce 100`, `100 ce`, plain integer including `-44`. Anything else falls through to text search. We deliberately *don't* parse phrases like "the 1700s" or "third century" — the cost is small (user retypes `1750`) and parsing intent is brittle.
- **No fuzzy matching library**: at ~50 events, plain `String.includes` on lowercased title/description is enough. Earlier matches in the title rank above later matches; description matches always rank below any title hit. If/when the corpus grows, swap in `fuse.js` or similar.
- **Match by `data-event-id`, not refs**: react-chrono renders each card via the children API, but its internal wrapper around our `EventCard` is its own DOM node we don't control. Selecting the inner element by data attribute and letting `scrollIntoView` walk up to the scroll context is robust and version-independent.
- **`/` shortcut is the standard "site search" affordance** (GitHub, YouTube, etc.). The handler ignores `/` typed inside any existing input/textarea so it doesn't hijack normal typing.
- **`onPointerDown` close-on-outside instead of `mousedown`/`click`**: pointer events fire before focus moves, so we don't get into a state where clicking a result closes the dropdown before its `onClick` runs. The dropdown's own `onPointerDown={preventDefault}` keeps the input focused while interacting with results.
- **Flash highlight on the inner `EventCard` `<div>`, not the outer react-chrono card**: we don't have a stable selector for the outer card in this version of react-chrono. The inner div is inside the card's content area and the highlight is plenty visible when the card is centred.

## Future hooks
- **Search across episodes too**: today's index is curated events only. Once the episode corpus is meaningful, surface episode hits as a second result group.
- **Era filter chips** under the bar (Ancient/Classical/…) for quick scoping.
