/**
 * Shape that gets written to Vercel Blob and consumed by the page. Stable
 * across runs — bumping CLASSIFIER_VERSION forces re-classification.
 */

export type Confidence = "high" | "medium" | "low";

export type CoverRange = {
  startYear: number;
  endYear: number;
  /** Optional month/day precision when the LLM can extract a specific date
   *  from the title/description. Used as tiebreakers when sorting episodes
   *  that share a year. 1-indexed (Jan = 1). Omit when unknown. */
  startMonth?: number;
  startDay?: number;
  endMonth?: number;
  endDay?: number;
};

/**
 * When an episode is part of a multi-part series (e.g. "The French Revolution
 * | Part 2 | The Diamond Necklace Scandal"), the classifier extracts the
 * series identity here. partNumber is 1-indexed; totalParts is best-effort.
 */
export type SeriesInfo = {
  name: string;
  partNumber: number;
  totalParts?: number;
};

export type ClassifiedEpisode = {
  /** YouTube video id — also our canonical id. */
  youtubeId: string;
  title: string;
  /** First ~500 chars of the YouTube description; full text isn't useful here. */
  description: string;
  publishedAt: string;
  durationSeconds: number;
  /** YouTube thumbnail URL we'll use as the event cover image. */
  thumbnailUrl: string;
  url: string;
  /** Year ranges the episode is "about" — negative years are BC. */
  covers: CoverRange[];
  /** Ids from `lib/data/events.ts` that this episode is materially about. */
  eventIds: string[];
  confidence: Confidence;
  classifierVersion: string;
  /** ISO timestamp the episode was classified. Useful for cache invalidation. */
  classifiedAt: string;
  /** Series membership, when the LLM identifies this as part of a series. */
  series?: SeriesInfo;
  /**
   * True when classification fell back to the safe default (covers: [],
   * confidence: "low") because all attempts threw. The orchestrator uses this
   * to retry on the next run without bumping CLASSIFIER_VERSION.
   */
  classifierFallback?: boolean;
};

/** Optional human override layer — wins over LLM output. */
export type EpisodeOverride = {
  covers?: CoverRange[];
  eventIds?: string[];
  /** If true, treat this episode as having no temporal anchor (skip from timeline). */
  skip?: boolean;
};

/** What we actually persist to Blob. */
export type EpisodeIndex = {
  syncedAt: string;
  classifierVersion: string;
  channelId: string;
  episodes: ClassifiedEpisode[];
};
