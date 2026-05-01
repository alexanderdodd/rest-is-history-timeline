/**
 * Server-side loader for the episode index that powers the timeline page.
 * Reads from Vercel Blob with ISR semantics — the cron route calls
 * revalidatePath("/") after a sync, so a fresh fetch happens then.
 *
 * Runs at request time on the server (Node runtime). When BLOB_READ_WRITE_TOKEN
 * is missing (e.g. fresh local dev with no .env.local), returns [] so the
 * page renders without episode data rather than crashing.
 */

import "server-only";
import { list } from "@vercel/blob";
import { BLOB_PATHNAME } from "@/lib/sync/blob";
import type { ClassifiedEpisode, EpisodeIndex } from "@/lib/sync/types";

export type PositionedEpisode = ClassifiedEpisode & {
  /** Year on the historical timeline this episode is plotted at — the
   * midpoint of the first cover range. */
  timelineYear: number;
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

/**
 * Compute a single timeline position for an episode: the start year of the
 * first covers range. Anchoring at the start (rather than the midpoint) is
 * usually closer to "what the episode is opening on" and dodges the broad-
 * range midpoint-junk problem.
 */
function timelinePosition(ep: ClassifiedEpisode): number | null {
  if (ep.covers.length === 0) return null;
  return ep.covers[0].startYear;
}

/**
 * Episodes positioned chronologically by what they're *about* (oldest first).
 * Episodes with no temporal anchor (covers: []) are excluded — they don't
 * belong on a historical timeline.
 */
export function positionEpisodes(
  index: EpisodeIndex | null,
): PositionedEpisode[] {
  if (!index) return [];
  const out: PositionedEpisode[] = [];
  for (const ep of index.episodes) {
    const year = timelinePosition(ep);
    if (year === null) continue;
    out.push({ ...ep, timelineYear: year });
  }
  // Stable secondary sort by publishedAt so co-located episodes from the
  // same series read in publish order.
  out.sort((a, b) => {
    if (a.timelineYear !== b.timelineYear) return a.timelineYear - b.timelineYear;
    return a.publishedAt.localeCompare(b.publishedAt);
  });
  return out;
}

export async function loadEpisodesForTimeline(): Promise<PositionedEpisode[]> {
  const index = await loadEpisodeIndex();
  return positionEpisodes(index);
}
