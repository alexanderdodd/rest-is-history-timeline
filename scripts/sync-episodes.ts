/**
 * Local CLI for the episode sync. Loads .env.local, runs the orchestrator,
 * prints progress. Use this for the one-time backfill and for ad-hoc
 * re-syncs while iterating on the classifier prompt.
 *
 * Usage:
 *   npm run sync-episodes
 *   npm run sync-episodes -- --limit 5     # smoke test on first N new videos
 */

import { config as loadEnv } from "dotenv";
import { syncEpisodes, type SyncEvent } from "../lib/sync/run";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

function parseArgs(argv: string[]): { limit?: number } {
  const out: { limit?: number } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      out.limit = Number(argv[i + 1]);
      i++;
    }
  }
  return out;
}

function formatLog(ev: SyncEvent): string {
  switch (ev.type) {
    case "stage":
      return `→ ${ev.message}`;
    case "fetched":
      return `  ${ev.episodes} episodes (filtered from ${ev.total} videos)`;
    case "diff":
      return `  to classify: ${ev.toClassify} | reused from cache: ${ev.reused}`;
    case "classified":
      return `  [${ev.index}/${ev.total}] classified ${ev.videoId}`;
    case "done":
      return `✓ ${ev.total} episodes total — added ${ev.added}, reclassified ${ev.reclassified}`;
  }
}

async function main(): Promise<void> {
  const { limit } = parseArgs(process.argv.slice(2));

  const required = ["YOUTUBE_API_KEY", "OPENROUTER_API_KEY", "BLOB_READ_WRITE_TOKEN"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env: ${missing.join(", ")}`);
    console.error("Set them in .env.local — see features/episode-sync.md.");
    process.exit(1);
  }

  const result = await syncEpisodes({
    limit,
    log: (ev) => console.log(formatLog(ev)),
  });

  console.log(`\nBlob URL: ${result.blobUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
