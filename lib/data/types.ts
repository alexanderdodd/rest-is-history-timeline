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

/**
 * The runtime episode shape lives in `lib/sync/types.ts` as `ClassifiedEpisode`
 * and is loaded from Vercel Blob via `lib/episodes-loader.ts`. There's no
 * static episode list in this repo.
 */
