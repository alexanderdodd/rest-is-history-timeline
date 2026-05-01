/**
 * Thin YouTube Data API v3 client. Only the bits we need: channel-by-handle
 * resolution, paginated uploads-playlist fetch, and a videos.list lookup for
 * durations (so we can filter shorts/trailers).
 */

const API = "https://www.googleapis.com/youtube/v3";

export type YouTubeVideo = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
};

type ChannelListResponse = {
  items?: Array<{
    id: string;
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
};

type PlaylistItemsResponse = {
  nextPageToken?: string;
  items?: Array<{
    contentDetails: {
      videoId: string;
      videoPublishedAt?: string;
    };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails?: Record<string, { url: string }>;
    };
  }>;
};

type VideosListResponse = {
  items?: Array<{
    id: string;
    contentDetails: { duration: string };
  }>;
};

function requireKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  return key;
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", requireKey());

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Resolve a channel handle (e.g. "@restishistorypod") to its uploads playlist. */
export async function resolveUploadsPlaylist(handle: string): Promise<{
  channelId: string;
  uploadsPlaylistId: string;
}> {
  const data = await get<ChannelListResponse>("channels", {
    part: "id,contentDetails",
    forHandle: handle.startsWith("@") ? handle : `@${handle}`,
  });
  const channel = data.items?.[0];
  if (!channel?.id) throw new Error(`No channel found for handle ${handle}`);
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(`Channel ${channel.id} has no uploads playlist`);
  }
  return { channelId: channel.id, uploadsPlaylistId };
}

/** Parse ISO 8601 duration like "PT1H23M45S" into seconds. */
export function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, h = "0", min = "0", s = "0"] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/** Pick the largest available thumbnail URL. */
function bestThumbnail(thumbs: Record<string, { url: string }> | undefined): string {
  if (!thumbs) return "";
  return (
    thumbs.maxres?.url ??
    thumbs.standard?.url ??
    thumbs.high?.url ??
    thumbs.medium?.url ??
    thumbs.default?.url ??
    ""
  );
}

/**
 * Fetch every video in an uploads playlist. Pages are 50 items max. Combines
 * snippet from playlistItems with duration from videos.list (one extra call
 * per page of 50 to keep quota usage reasonable).
 */
export async function fetchAllVideos(uploadsPlaylistId: string): Promise<YouTubeVideo[]> {
  const out: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;
    const page = await get<PlaylistItemsResponse>("playlistItems", params);

    const ids = (page.items ?? [])
      .map((it) => it.contentDetails.videoId)
      .filter(Boolean);
    if (ids.length === 0) break;

    const durations = await get<VideosListResponse>("videos", {
      part: "contentDetails",
      id: ids.join(","),
    });
    const durationById = new Map(
      (durations.items ?? []).map((v) => [v.id, parseIsoDuration(v.contentDetails.duration)]),
    );

    for (const it of page.items ?? []) {
      const id = it.contentDetails.videoId;
      out.push({
        videoId: id,
        title: it.snippet.title,
        description: it.snippet.description ?? "",
        publishedAt: it.contentDetails.videoPublishedAt ?? it.snippet.publishedAt,
        durationSeconds: durationById.get(id) ?? 0,
        thumbnailUrl: bestThumbnail(it.snippet.thumbnails),
      });
    }

    pageToken = page.nextPageToken;
  } while (pageToken);

  return out;
}

/** Filter out shorts and trailers — keep only proper episodes. */
export function isLikelyEpisode(video: YouTubeVideo): boolean {
  // Most RIH episodes are 35min+; shorts are <60s; trailers vary.
  if (video.durationSeconds < 20 * 60) return false;
  const lowerTitle = video.title.toLowerCase();
  if (lowerTitle.includes("trailer")) return false;
  return true;
}
