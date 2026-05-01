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

export type EpisodeGroup = {
  /** The shared timeline year for every episode in this group. */
  year: number;
  /** Episodes plotted at this year, ordered by publish date. */
  episodes: PositionedEpisode[];
};

/**
 * Sort key for episodes within a year row: series-named episodes cluster by
 * (name, partNumber); standalone episodes (no series) come after, in publish
 * order. Keeps multi-part series readable in narrative order.
 */
function withinYearComparator(a: PositionedEpisode, b: PositionedEpisode): number {
  const aSeries = a.series?.name ?? null;
  const bSeries = b.series?.name ?? null;
  if (aSeries && bSeries) {
    if (aSeries !== bSeries) return aSeries.localeCompare(bSeries);
    return (a.series!.partNumber ?? 0) - (b.series!.partNumber ?? 0);
  }
  if (aSeries) return -1; // series-named first
  if (bSeries) return 1;
  return a.publishedAt.localeCompare(b.publishedAt);
}

/**
 * Group positioned episodes by timelineYear. The timeline renders one row
 * per group (year label appears once) with multiple cards stacked when the
 * group has more than one episode. Within a group, series parts read in
 * order before standalone episodes.
 */
export function groupEpisodesByYear(
  episodes: PositionedEpisode[],
): EpisodeGroup[] {
  const buckets = new Map<number, PositionedEpisode[]>();
  for (const ep of episodes) {
    const arr = buckets.get(ep.timelineYear);
    if (arr) arr.push(ep);
    else buckets.set(ep.timelineYear, [ep]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, eps]) => ({
      year,
      episodes: eps.slice().sort(withinYearComparator),
    }));
}

export async function loadEpisodeGroupsForTimeline(): Promise<EpisodeGroup[]> {
  return groupEpisodesByYear(await loadEpisodesForTimeline());
}
