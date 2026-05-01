/**
 * Vercel Blob persistence layer for the episode index. The blob is public-read
 * (so the page's ISR fetch is fast) and stored at a fixed pathname so we can
 * overwrite it in place on each sync.
 */

import { put, list } from "@vercel/blob";
import type { EpisodeIndex } from "./types";

export const BLOB_PATHNAME = "episodes/index.json";

export async function readEpisodeIndex(): Promise<EpisodeIndex | null> {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
  const existing = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!existing) return null;

  const res = await fetch(existing.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as EpisodeIndex;
}

export async function writeEpisodeIndex(index: EpisodeIndex): Promise<string> {
  const blob = await put(BLOB_PATHNAME, JSON.stringify(index, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return blob.url;
}
