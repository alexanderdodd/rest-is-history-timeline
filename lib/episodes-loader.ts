/**
 * Server-side loader for the episode index that powers the timeline page.
 * Reads from Vercel Blob with ISR semantics — the cron route calls
 * revalidatePath("/") after a sync, so a fresh fetch happens then.
 *
 * Runs at request time on the server (Node runtime). When BLOB_READ_WRITE_TOKEN
 * is missing (e.g. fresh local dev with no .env.local), returns null so the
 * page renders without episode data rather than crashing.
 */

import "server-only";
import { list } from "@vercel/blob";
import { BLOB_PATHNAME } from "@/lib/sync/blob";
import { EVENTS } from "@/lib/data/events";
import type { HistoricalEvent } from "@/lib/data/types";
import type { ClassifiedEpisode, EpisodeIndex } from "@/lib/sync/types";

export type EventWithEpisodes = HistoricalEvent & {
  /** Best-match episode, used for the card cover image and primary link. */
  primaryEpisode?: ClassifiedEpisode;
  /** All episodes that match this event, primary first. */
  episodes: ClassifiedEpisode[];
};

export async function loadEpisodeIndex(): Promise<EpisodeIndex | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const found = blobs.find((b) => b.pathname === BLOB_PATHNAME);
    if (!found) return null;
    const res = await fetch(found.url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as EpisodeIndex;
  } catch (err) {
    console.warn("loadEpisodeIndex failed:", err);
    return null;
  }
}

const CONFIDENCE_RANK: Record<ClassifiedEpisode["confidence"], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * For each curated event, find every classified episode that's about it
 * (explicit eventIds match, OR a covers range that contains the year), and
 * pick the highest-confidence one as the primary.
 */
export function attachEpisodes(
  events: HistoricalEvent[],
  index: EpisodeIndex | null,
): EventWithEpisodes[] {
  if (!index) return events.map((e) => ({ ...e, episodes: [] }));

  return events.map((event) => {
    const matches = index.episodes.filter((ep) => {
      if (ep.eventIds.includes(event.id)) return true;
      return ep.covers.some(
        (r) => event.year >= r.startYear && event.year <= r.endYear,
      );
    });

    matches.sort((a, b) => {
      const conf = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
      if (conf !== 0) return conf;
      // Prefer episodes that name this event explicitly.
      const aExplicit = a.eventIds.includes(event.id) ? 1 : 0;
      const bExplicit = b.eventIds.includes(event.id) ? 1 : 0;
      if (aExplicit !== bExplicit) return bExplicit - aExplicit;
      // Newest first.
      return b.publishedAt.localeCompare(a.publishedAt);
    });

    const primary = matches[0];
    return {
      ...event,
      primaryEpisode: primary,
      episodes: matches,
      imageUrl: event.imageUrl ?? primary?.thumbnailUrl,
    };
  });
}

export async function loadEventsWithEpisodes(): Promise<EventWithEpisodes[]> {
  const index = await loadEpisodeIndex();
  return attachEpisodes(EVENTS, index);
}
