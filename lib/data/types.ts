export type EraId =
  | "ancient"
  | "classical"
  | "medieval"
  | "early-modern"
  | "modern"
  | "contemporary";

export type HistoricalEvent = {
  id: string;
  /** Negative for BC, positive for AD. Year 0 is treated as 1 BC by convention. */
  year: number;
  /** 1-12, optional. Defaults to 1 (January). */
  month?: number;
  /** 1-31, optional. Defaults to 1. */
  day?: number;
  title: string;
  description: string;
  era: EraId;
  /**
   * Optional image for the event card. When an event has a related podcast
   * episode this will typically be the YouTube thumbnail of that episode;
   * otherwise can be a representative public-domain image.
   */
  imageUrl?: string;
};

export type Era = {
  id: EraId;
  name: string;
  /** Inclusive start year (negative for BC). */
  startYear: number;
  /** Exclusive end year. */
  endYear: number;
};

export type Episode = {
  id: string;
  title: string;
  /** YouTube URL or canonical episode link. */
  url: string;
  /** YouTube video ID — used to derive thumbnail URLs. */
  youtubeId?: string;
  /** ISO date the episode aired. */
  publishedAt?: string;
  /**
   * Years (or year ranges) on the timeline this episode is "about".
   * Used to surface the episode when those events/era are in view.
   */
  covers: Array<{ startYear: number; endYear: number }>;
  /** Optional explicit links to event ids. */
  eventIds?: string[];
};
