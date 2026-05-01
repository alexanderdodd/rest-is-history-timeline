/**
 * Search helpers for the timeline. Two query modes:
 *   - year: "1789", "44 BC", "AD 800" — episodes whose covers contain (or
 *           are nearest to) the year, sorted by closeness to start year
 *   - text: "napoleon", "french revolution" — substring match on
 *           episode title + description, title hits beating description hits
 */

import type { PositionedEpisode } from "@/lib/episodes-loader";

export type SearchResult = {
  episode: PositionedEpisode;
  reason: "year-in-range" | "near-year" | "title" | "description";
  /** Lower is better; used to sort. */
  score: number;
};

/**
 * Parse a query string as a year. Accepts:
 *   "1789"        → 1789
 *   "1789 AD"     → 1789
 *   "AD 800"      → 800
 *   "44 BC"       → -44
 *   "BCE 100"     → -100
 * Returns null if the query is not a year-like string.
 */
export function parseYearQuery(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const plain = /^-?\d+$/.exec(s);
  if (plain) return Number(plain[0]);

  const bcRe = /^(?:bc|bce)\s*(\d+)$|^(\d+)\s*(?:bc|bce)$/;
  const bcMatch = bcRe.exec(s);
  if (bcMatch) return -Number(bcMatch[1] ?? bcMatch[2]);

  const adRe = /^(?:ad|ce)\s*(\d+)$|^(\d+)\s*(?:ad|ce)$/;
  const adMatch = adRe.exec(s);
  if (adMatch) return Number(adMatch[1] ?? adMatch[2]);

  return null;
}

const MAX_RESULTS = 12;

export function searchEpisodes(
  query: string,
  episodes: PositionedEpisode[],
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const year = parseYearQuery(q);
  if (year !== null) {
    return episodes
      .map<SearchResult>((ep) => {
        const inRange = ep.covers.some(
          (c) => year >= c.startYear && year <= c.endYear,
        );
        const distance = Math.abs(ep.timelineYear - year);
        return {
          episode: ep,
          reason: inRange ? "year-in-range" : "near-year",
          // Boost in-range matches by giving them a 0-1000 score band ahead
          // of any near-year fallback.
          score: inRange ? distance : 10_000 + distance,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS);
  }

  const needle = q.toLowerCase();
  return episodes
    .map<SearchResult | null>((ep) => {
      const title = ep.title.toLowerCase();
      const desc = ep.description.toLowerCase();
      const titleIdx = title.indexOf(needle);
      const descIdx = desc.indexOf(needle);
      if (titleIdx >= 0) return { episode: ep, reason: "title", score: titleIdx };
      if (descIdx >= 0) return { episode: ep, reason: "description", score: 1000 + descIdx };
      return null;
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_RESULTS);
}
