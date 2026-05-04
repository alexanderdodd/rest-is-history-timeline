/**
 * Local debugging tool: query the live blob episode index by free-text and
 * print what the classifier knows about matching episodes. Useful when an
 * episode you expect to see on the timeline is missing or mis-anchored —
 * tells you whether it's in the index at all, and if so, what its covers /
 * series / publish date look like.
 *
 * Usage:
 *   npm run inspect-episodes -- mexico
 *   npm run inspect-episodes -- "conquest of"
 */

import { config as loadEnv } from "dotenv";
import { readEpisodeIndex } from "../lib/sync/blob";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main(): Promise<void> {
  const term = process.argv.slice(2).join(" ").trim().toLowerCase();
  if (!term) {
    console.error("Usage: npm run inspect-episodes -- <search term>");
    process.exit(1);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN — set it in .env.local.");
    process.exit(1);
  }

  const index = await readEpisodeIndex();
  if (!index) {
    console.error("No episode index found in blob.");
    process.exit(1);
  }

  const matches = index.episodes.filter(
    (ep) =>
      ep.title.toLowerCase().includes(term) ||
      ep.description.toLowerCase().includes(term),
  );

  console.log(
    `Index has ${index.episodes.length} episodes total, classifierVersion=${index.classifierVersion}.`,
  );
  console.log(`${matches.length} matched "${term}":\n`);

  for (const ep of matches) {
    console.log(`• ${ep.title}`);
    console.log(`  published: ${ep.publishedAt}`);
    console.log(`  covers:    ${JSON.stringify(ep.covers)}`);
    console.log(
      `  series:    ${ep.series ? JSON.stringify(ep.series) : "—"}`,
    );
    console.log(
      `  conf:      ${ep.confidence}${ep.classifierFallback ? " (FALLBACK)" : ""}${
        ep.hostsOnly === false ? " · guest" : ""
      }`,
    );
    console.log(`  url:       ${ep.url}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
