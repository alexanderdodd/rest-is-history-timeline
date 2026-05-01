/**
 * Site-wide SEO constants. Resolved once on import.
 *
 * SITE_URL precedence:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, set this when deploying behind a
 *      custom domain ("https://restishistory-timeline.app").
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel-injected, the canonical
 *      production hostname (without scheme). Stable across deployments.
 *   3. VERCEL_URL — the per-deployment hostname, used on previews.
 *   4. http://localhost:3000 — local dev fallback.
 *
 * Anything that ends up in metadataBase needs a real URL — relative og:image
 * paths are resolved against it.
 */

function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "The Rest Is History Timeline";

export const SITE_TAGLINE = "A visual timeline of human history, mapped to The Rest Is History podcast";

export const SITE_DESCRIPTION =
  "An interactive timeline of human history from 3000 BC to the present, with every episode of The Rest Is History plotted on the period it covers. Scrub through the centuries to find Tom Holland and Dominic Sandbrook's deep dives — the French Revolution, the fall of Rome, the Cold War, and hundreds more — without leaving the page.";

export const SITE_KEYWORDS = [
  "The Rest Is History",
  "The Rest Is History podcast",
  "Tom Holland",
  "Dominic Sandbrook",
  "history podcast",
  "timeline of human history",
  "history timeline",
  "world history timeline",
  "podcast timeline",
  "interactive history",
  "visual history",
];
