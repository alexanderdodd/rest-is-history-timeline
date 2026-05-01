# seo

Search-engine and social-share metadata for the timeline. The site is a single page, so SEO is concentrated entirely on `/` — but the rules below ship the full set of signals Google, Bing, and link-preview crawlers expect.

## What it does

- Page metadata: title (with template), description, keywords, canonical, Open Graph, Twitter Card, robots/googleBot directives, themeColor, lang.
- Auto-generated 1200×630 OpenGraph/Twitter image at `/opengraph-image` (Next file convention picks it up and wires it into the page's `og:image` and `twitter:image`).
- `/robots.txt` allowing all crawlers, with a `Sitemap:` pointer.
- `/sitemap.xml` with one entry (the home page) and a weekly `changeFrequency` matching the cron sync cadence.
- JSON-LD structured data injected into the page:
  - `WebSite` schema describing the site and its `about` (the podcast).
  - `ItemList` of curated historical events, each emitted as `Event` items with `startDate` (BC dates use the ISO `-YYYY` format).
- A screen-reader-only `<h1>` (`.sr-only` utility) so the page has the H1 SEO/accessibility expects without intruding on the timeline-only design.

## Why

A single-page app is easy to under-optimise: the title and meta description are the only things Google has to work with for ranking, and OG images are what makes the link look real on Slack/Twitter/iMessage. Without these, the canonical search snippet is `localhost`-default-bad, and shares look like broken thumbnails.

Beyond that, the timeline is genuinely useful content (every Rest Is History episode mapped to history) and we want it discoverable when people search "the rest is history timeline", "rest is history episodes by date", "history podcast timeline", etc. The keywords list nudges that. The JSON-LD `WebSite` + `ItemList` give Google a structured view of what the page is about — which sometimes earns rich results, and at minimum gives the indexer better context.

## How it works

- **`lib/site.ts`** — single source of truth for `SITE_URL`, `SITE_NAME`, `SITE_TAGLINE`, `SITE_DESCRIPTION`, `SITE_KEYWORDS`. `SITE_URL` resolution order: `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` → `http://localhost:3000`. `metadataBase` uses this — relative `og:image` paths resolve against it.
- **`app/layout.tsx`** — owns the global `metadata` and `viewport` exports. Title uses a template (`%s | The Rest Is History Timeline`) so any future child route can set its own title.
- **`app/page.tsx`** — renders the JSON-LD `<script type="application/ld+json">` blocks (WebSite + ItemList of events) plus the visually-hidden `<h1>`. Everything below it is the timeline UI.
- **`app/opengraph-image.tsx`** — uses `next/og`'s `ImageResponse` to render a 1200×630 PNG at build time (or per-request, edge-cached). Picks up the filename convention; no manual `<meta>` wiring needed.
- **`app/robots.ts`** + **`app/sitemap.ts`** — Next file-based metadata routes. Pure functions returning the spec object; Next emits `/robots.txt` and `/sitemap.xml` automatically.
- **`.sr-only`** — accessibility/SEO utility in `globals.css` that hides an element visually but keeps it in the document for screen readers and crawlers.

## Non-obvious decisions / constraints

- **`SITE_URL` falls back to env-injected Vercel hostnames** so previews still get correct canonical/OG URLs without manual setup. Set `NEXT_PUBLIC_SITE_URL` once a custom domain is live to lock the canonical to the production hostname.
- **`og:image` is dynamic, not a static asset.** Next's file convention (`app/opengraph-image.tsx`) is preferred over checking in a PNG: copy stays in-sync with `SITE_NAME`, no manual export step.
- **JSON-LD lives inline on the page**, not in `<head>`. Google reads `application/ld+json` from anywhere in the document. Inlining keeps the schema co-located with the data it describes (the curated `EVENTS` array), so changes to events don't require remembering to update a separate file.
- **`Event.startDate` for BC years uses the ISO-8601 expanded year format** (`-NNNN`, zero-padded to 4 digits). Plain `-44` is rejected by some validators; `-0044` is correct.
- **No description for `Event` items beyond what's in `lib/data/events.ts`** — the corpus is small (~60 entries) and adding a separate SEO description per event would duplicate content. The list is for crawlers to understand the page's scope, not to rank for individual event queries.
- **No `apple-touch-icon` / `manifest.json` yet.** Skipped because the site isn't installable as a PWA and the inline-SVG favicon already works on iOS via `link rel="icon"`. Add if/when we want a homescreen install experience.
- **Viewport `themeColor: #0c0d12`** matches the page background so the iOS status bar / Android URL bar don't render a jarring white strip.
- **`googleBot` directives explicitly opt into rich snippets** (`max-image-preview: large`, unbounded `max-snippet`/`max-video-preview`). Default-on for indexers, but stating them avoids accidental future `nosnippet` if a header gets added elsewhere.
