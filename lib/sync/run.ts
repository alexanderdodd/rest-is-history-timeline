/**
 * Orchestrates a sync run: fetch videos → diff against existing index →
 * classify only the new/stale ones → apply overrides → persist.
 *
 * Pure-ish — takes a "logger" callback so the local CLI and the Vercel cron
 * route can each render progress in their own way.
 */

import overridesData from "@/data/episode-overrides.json";
import {
  CLASSIFIER_VERSION,
  buildClassifiedEpisode,
  classifyVideo,
} from "./classify";
import { readEpisodeIndex, writeEpisodeIndex } from "./blob";
import {
  fetchAllVideos,
  isLikelyEpisode,
  resolveUploadsPlaylist,
  type YouTubeVideo,
} from "./youtube";
import type { ClassifiedEpisode, EpisodeIndex, EpisodeOverride } from "./types";

export const RIH_HANDLE = "@restishistorypod";
const CLASSIFY_CONCURRENCY = 4;

type Logger = (event: SyncEvent) => void;

export type SyncEvent =
  | { type: "stage"; message: string }
  | { type: "fetched"; total: number; episodes: number }
  | { type: "diff"; toClassify: number; reused: number }
  | { type: "classified"; videoId: string; index: number; total: number }
  | { type: "done"; total: number; added: number; reclassified: number };

export type SyncOptions = {
  /** When set, classify at most this many new videos (useful for smoke tests). */
  limit?: number;
  /** Pass channelId from a cached source to skip the resolve step. */
  channelId?: string;
  uploadsPlaylistId?: string;
  log?: Logger;
};

export type SyncResult = {
  total: number;
  added: number;
  reclassified: number;
  blobUrl: string;
};

const overrides = parseOverrides(overridesData);

function parseOverrides(raw: unknown): Record<string, EpisodeOverride> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, EpisodeOverride> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("$")) continue; // schema/comment keys
    if (typeof v === "object" && v !== null) out[k] = v as EpisodeOverride;
  }
  return out;
}

function applyOverride(
  episode: ClassifiedEpisode,
  override: EpisodeOverride | undefined,
): ClassifiedEpisode | null {
  if (!override) return episode;
  if (override.skip) return null;
  return {
    ...episode,
    covers: override.covers ?? episode.covers,
    eventIds: override.eventIds ?? episode.eventIds,
  };
}

/** Run promises in parallel with a fixed concurrency cap, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function syncEpisodes(opts: SyncOptions = {}): Promise<SyncResult> {
  const log: Logger = opts.log ?? (() => {});

  let { channelId, uploadsPlaylistId } = opts;
  if (!channelId || !uploadsPlaylistId) {
    log({ type: "stage", message: `Resolving channel ${RIH_HANDLE}…` });
    const resolved = await resolveUploadsPlaylist(RIH_HANDLE);
    channelId = resolved.channelId;
    uploadsPlaylistId = resolved.uploadsPlaylistId;
  }

  log({ type: "stage", message: "Fetching all videos from YouTube…" });
  const videos = await fetchAllVideos(uploadsPlaylistId);
  const episodes = videos.filter(isLikelyEpisode);
  log({ type: "fetched", total: videos.length, episodes: episodes.length });

  log({ type: "stage", message: "Loading existing episode index from Blob…" });
  const existing = await readEpisodeIndex();
  const existingById = new Map<string, ClassifiedEpisode>(
    (existing?.episodes ?? []).map((e) => [e.youtubeId, e]),
  );

  const toClassify: YouTubeVideo[] = [];
  const reused: ClassifiedEpisode[] = [];
  for (const v of episodes) {
    const prev = existingById.get(v.videoId);
    if (prev && prev.classifierVersion === CLASSIFIER_VERSION) {
      reused.push(prev);
    } else {
      toClassify.push(v);
    }
  }

  const slice = opts.limit ? toClassify.slice(0, opts.limit) : toClassify;
  log({ type: "diff", toClassify: slice.length, reused: reused.length });

  const newlyClassified = await mapWithConcurrency(
    slice,
    CLASSIFY_CONCURRENCY,
    async (video, i) => {
      const output = await classifyVideo(video);
      const built = buildClassifiedEpisode(video, output);
      log({ type: "classified", videoId: video.videoId, index: i + 1, total: slice.length });
      return built;
    },
  );

  // Merge and apply overrides.
  const merged: ClassifiedEpisode[] = [];
  for (const ep of [...reused, ...newlyClassified]) {
    const finalEp = applyOverride(ep, overrides[ep.youtubeId]);
    if (finalEp) merged.push(finalEp);
  }

  // Stable order: newest episodes first.
  merged.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const index: EpisodeIndex = {
    syncedAt: new Date().toISOString(),
    classifierVersion: CLASSIFIER_VERSION,
    channelId,
    episodes: merged,
  };

  log({ type: "stage", message: "Writing index to Blob…" });
  const blobUrl = await writeEpisodeIndex(index);

  const added = newlyClassified.length;
  const reclassified = newlyClassified.filter((ep) => existingById.has(ep.youtubeId)).length;
  const fresh = added - reclassified;
  log({ type: "done", total: merged.length, added: fresh, reclassified });

  return { total: merged.length, added: fresh, reclassified, blobUrl };
}
