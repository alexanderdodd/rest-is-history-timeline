import type { Episode } from "./types";

/**
 * Podcast episodes from "The Rest Is History" mapped onto the timeline.
 *
 * Empty for now — populate as episodes are catalogued. Each entry should
 * have a `covers` range (or set of ranges) so the episode can be surfaced
 * when that part of the timeline is in view.
 *
 * Future: replace this static list with a fetched index, or generate from
 * the show's RSS / YouTube feed.
 */
export const EPISODES: Episode[] = [];
