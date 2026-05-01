# analytics

Vercel Web Analytics — basic page-view + visitor counts for the deployed timeline. Lets us see whether anyone is actually using the thing without standing up a separate analytics stack.

## What it does

- Counts page views and unique visitors on the production deployment.
- Reports bounce rate and traffic sources in the Vercel dashboard (Project → Analytics).
- Runs cookieless: no consent banner needed, no PII collected.

## Why

A deployed timeline with no analytics is a deployed timeline with no feedback loop. Vercel's first-party Web Analytics is one component (`<Analytics />`), one dependency (`@vercel/analytics`), and free at the volumes a personal project will see — strictly better than rolling our own or pulling in Google Analytics for the same coverage.

## How it works

- `app/layout.tsx` imports the Next-flavoured component (`@vercel/analytics/next`) and renders `<Analytics />` once at the bottom of `<body>`. The component is a client component and registers a single beacon listener; all the heavy lifting happens in Vercel's edge.
- No env vars. The Vercel runtime tags requests automatically when Web Analytics is enabled on the project. Locally and on previews the script no-ops — it only sends events from the production hostname.
- The package was added to `dependencies` (`@vercel/analytics`), not `devDependencies` — it ships in the client bundle.

## Non-obvious decisions / constraints

- **Imported from `@vercel/analytics/next`, not `@vercel/analytics/react`.** The Next-flavoured entry point is preferred for App Router projects because it tracks route changes via the Next router rather than via History API listeners — fewer false positives on transitions.
- **Mounted in the root layout, not the page.** One `<Analytics />` per app, lifted to the highest stable boundary so it doesn't unmount on navigation.
- **Below `{children}`, not above.** Doesn't matter for behaviour but keeps the visible page above the analytics tag in the DOM, which is the convention.
- **No JSON-LD or `<noscript>` fallback.** Analytics is for measuring real users, not crawlers; bots without JS shouldn't be counted anyway.
- **Cookieless = no consent banner needed in most jurisdictions.** If we ever add identifying analytics (Plausible's session-stitching, custom user IDs, etc.) we'll need to revisit.
