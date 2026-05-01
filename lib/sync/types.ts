/**
 * Shape that gets written to Vercel Blob and consumed by the page. Stable
 * across runs — bumping CLASSIFIER_VERSION forces re-classification.
 */

export type Confidence = "high" | "medium" | "low";

export type CoverRange = {
  startYear: number;
  endYear: number;
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
