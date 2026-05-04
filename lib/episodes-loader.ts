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
  /**
   * Stable id grouping this episode with other parts of the SAME production.
   *
   * The classifier emits `(topic, seriesNumber)` based purely on title text,
   * which can't disambiguate two distinct productions of the same show that
   * both happen to be called e.g. "The French Revolution Series 1" — the
   * older 5-part series from 2022 and the newer 7-part Goalhanger series
   * both end up there. We disambiguate at load-time by clustering on
   * publishedAt: episodes claiming the same `(topic, seriesNumber)` but
   * published more than a few months apart are treated as separate
   * productions and get distinct productionIds. Standalone episodes (no
   * series) get their youtubeId as their productionId so they never group.
   */
  productionId: string;
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

/** Compare-key for a topic — slug-normalised so "The French Revolution"
 *  and "French Revolution" cluster together. */
function topicKey(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Walk every episode that claims a series, group by `(topic, seriesNumber)`,
 * sort each group by publishedAt, and split into separate "production"
 * clusters wherever consecutive parts have a publish gap larger than the
 * threshold. Two parts of the same actual show production are typically
 * released a few weeks apart; a gap of months almost always means a
 * different production happens to share the show name.
 */
const PRODUCTION_GAP_DAYS = 120;
const PRODUCTION_GAP_MS = PRODUCTION_GAP_DAYS * 24 * 60 * 60 * 1000;

function buildProductionMap(
  episodes: ClassifiedEpisode[],
): Map<string, string> {
  const groups = new Map<string, ClassifiedEpisode[]>();
  for (const ep of episodes) {
    if (!ep.series) continue;
    const key = `${topicKey(ep.series.topic)}-s${ep.series.seriesNumber}`;
    const arr = groups.get(key);
    if (arr) arr.push(ep);
    else groups.set(key, [ep]);
  }

  const out = new Map<string, string>();
  for (const [groupKey, group] of groups) {
    group.sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
    let cluster = 0;
    let prevTime: number | null = null;
    for (const ep of group) {
      const t = new Date(ep.publishedAt).getTime();
      if (prevTime !== null && t - prevTime > PRODUCTION_GAP_MS) cluster++;
      prevTime = t;
      out.set(ep.youtubeId, `${groupKey}-p${cluster}`);
    }
  }
  return out;
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
  const productionIds = buildProductionMap(index.episodes);
  const out: PositionedEpisode[] = [];
  for (const ep of index.episodes) {
    const year = timelinePosition(ep);
    if (year === null) continue;
    const productionId = productionIds.get(ep.youtubeId) ?? ep.youtubeId;
    out.push({ ...ep, timelineYear: year, productionId });
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

/** Optional month/day on the first cover, for sub-year ordering. */
function precisionScore(ep: PositionedEpisode): number {
  const c = ep.covers[0];
  if (!c) return 0;
  const m = c.startMonth ?? 1;
  const d = c.startDay ?? 1;
  return m * 100 + d; // 1xx..12xx; raw ordering only matters for tie-break
}

/**
 * Sort key for episodes within a year row:
 *   1. series episodes cluster by productionId (topic + seriesNumber +
 *      publishedAt-cluster), then partNumber — so two distinct productions
 *      that both happen to be called "FR Series 1" don't fight over slots.
 *   2. standalone episodes (no series) come after, ordered by precise date
 *      then publish order.
 */
function withinYearComparator(a: PositionedEpisode, b: PositionedEpisode): number {
  const aSeries = a.series ?? null;
  const bSeries = b.series ?? null;
  if (aSeries && bSeries) {
    if (a.productionId !== b.productionId) {
      return a.productionId.localeCompare(b.productionId);
    }
    return (aSeries.partNumber ?? 0) - (bSeries.partNumber ?? 0);
  }
  if (aSeries) return -1; // series episodes first
  if (bSeries) return 1;
  const ap = precisionScore(a);
  const bp = precisionScore(b);
  if (ap !== bp) return ap - bp;
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
