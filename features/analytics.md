# analytics

Vercel Web Analytics — page-view + visitor counts plus a small set of custom events that tell us how people are actually using the timeline. Lets us see whether anyone is finding episodes without standing up a separate analytics stack.

## What it does

- Counts page views and unique visitors on the production deployment.
- Reports bounce rate and traffic sources in the Vercel dashboard (Project → Analytics).
- Runs cookieless: no consent banner needed, no PII collected.
- Emits **three custom events** that capture the load-bearing user actions:
  - **`episode_click`** — fired when a user clicks an episode card through to YouTube. The primary "this thing worked" signal: did somebody find an episode they actually wanted to watch?
    - `episode_id` — youtubeId, lets us see which episodes resonate.
    - `year` — the timeline year the episode is plotted at, so we can aggregate clicks by era.
    - `confidence` — classifier confidence, so we can sanity-check whether low-confidence episodes still get clicks (or whether bad classifications kill engagement).
  - **`search_select`** — fired when a user picks a result from the search dropdown. Tells us whether the search bar is being used and *how* people search.
    - `match_reason` — `year-in-range` / `near-year` / `title` / `description`. The most useful property: distinguishes "I'm looking for episodes about 1789" (year-driven) from "I'm looking for episodes about Napoleon" (text-driven).
    - `query_len` — bucketed (`1-3` / `4-10` / `11+`) so we don't leak actual search text but can still see whether people type short or long queries.
  - **`scroll_depth`** — fired once per session at 25/50/75/100% page-height thresholds. Distinguishes "bounced at the spine" from "scrolled the full 3000 BC → present arc".
    - `depth` — `25` / `50` / `75` / `100`.

## Why

A deployed timeline with no analytics is a deployed timeline with no feedback loop. The free Web Analytics covers traffic and bounce; custom events cover behaviour. The three above answer:

- **Is the app actually useful?** episode_click counts. If they're near-zero, people aren't finding their way to YouTube and the page is just a static fact-check.
- **What are people looking for?** search_select.match_reason, aggregated. Mostly `near-year` would mean we should weight the year-driven UX harder; mostly `title` would mean we should invest in fuzzy text search.
- **Is the timeline worth scrolling all the way through?** scroll_depth funnel. If 90% drop off below 50%, we're probably top-heavy.

## Why

A deployed timeline with no analytics is a deployed timeline with no feedback loop. Vercel's first-party Web Analytics is one component (`<Analytics />`), one dependency (`@vercel/analytics`), and free at the volumes a personal project will see — strictly better than rolling our own or pulling in Google Analytics for the same coverage.

## How it works

- `app/layout.tsx` imports the Next-flavoured component (`@vercel/analytics/next`) and renders `<Analytics />` once at the bottom of `<body>`. The component is a client component and registers a single beacon listener; all the heavy lifting happens in Vercel's edge.
- No env vars. The Vercel runtime tags requests automatically when Web Analytics is enabled on the project. Locally and on previews the script no-ops — it only sends events from the production hostname.
- The package was added to `dependencies` (`@vercel/analytics`), not `devDependencies` — it ships in the client bundle.
- Custom events use `track()` from `@vercel/analytics`:
  - `components/EpisodeCard.tsx` calls `track("episode_click", ...)` from the cover and title `<a>` `onClick` handlers (both anchors point at YouTube — either click counts).
  - `components/SearchBar.tsx` calls `track("search_select", ...)` inside `select()` after the smooth-scroll succeeds.
  - `components/ScrollDepthTracker.tsx` is a render-nothing client component that listens to `window.scroll` (rAF-throttled), reports each 25/50/75/100% threshold once per session, and is mounted from `app/page.tsx`.

## Non-obvious decisions / constraints

- **Imported from `@vercel/analytics/next`, not `@vercel/analytics/react`.** The Next-flavoured entry point is preferred for App Router projects because it tracks route changes via the Next router rather than via History API listeners — fewer false positives on transitions.
- **Mounted in the root layout, not the page.** One `<Analytics />` per app, lifted to the highest stable boundary so it doesn't unmount on navigation.
- **Below `{children}`, not above.** Doesn't matter for behaviour but keeps the visible page above the analytics tag in the DOM, which is the convention.
- **No JSON-LD or `<noscript>` fallback.** Analytics is for measuring real users, not crawlers; bots without JS shouldn't be counted anyway.
- **Cookieless = no consent banner needed in most jurisdictions.** If we ever add identifying analytics (Plausible's session-stitching, custom user IDs, etc.) we'll need to revisit.
- **Custom events require Vercel Pro** at the time of writing — the free Web Analytics tier is page-views only. The `track()` calls will silently no-op on Hobby; they're cheap to leave in.
- **`query_len` is bucketed, not a raw number.** Avoids both leaking exact queries (which can sometimes contain identifying or sensitive search terms) and burning the 256-char-per-property limit. Three buckets keep the aggregation clean.
- **`scroll_depth` is rAF-throttled and de-duplicated per session.** Without throttling we'd send hundreds of events per scroll-jog; without de-dup the 100% threshold would fire repeatedly as users wiggle the page. The de-dup uses a `useRef<Set>` so it persists across renders within a session but resets on full reload, which is what we want for "did this session reach the bottom".
- **No exact-text search-query property.** We deliberately track `match_reason` + `query_len` instead of the raw `query`. We can answer "are people searching by year vs by name" without storing what they actually typed.
