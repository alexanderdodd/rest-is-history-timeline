/**
 * Search helpers for the timeline. Two query modes:
 *   - year: "1789", "44 BC", "AD 800" — match by closeness to that year
 *   - text: "napoleon", "french revolution" — substring match on
 *           title + description (era as a secondary signal)
 */

import type { HistoricalEvent } from "@/lib/data/types";

export type SearchResult = {
  event: HistoricalEvent;
  /** What about this event matched. Used for the result subtitle. */
  reason: "exact-year" | "near-year" | "title" | "description";
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

  // Try plain integer first.
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

const MAX_RESULTS = 8;

export function searchEvents(
  query: string,
  events: HistoricalEvent[],
): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const year = parseYearQuery(q);
  if (year !== null) {
    return events
      .map<SearchResult>((event) => {
        const distance = Math.abs(event.year - year);
        return {
          event,
          reason: distance === 0 ? "exact-year" : "near-year",
          score: distance,
        };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS);
  }

  const needle = q.toLowerCase();
  return events
    .map<SearchResult | null>((event) => {
      const title = event.title.toLowerCase();
      const desc = event.description.toLowerCase();
      const titleIdx = title.indexOf(needle);
      const descIdx = desc.indexOf(needle);
      if (titleIdx >= 0) {
        // Earlier matches in the title rank higher.
        return { event, reason: "title", score: titleIdx };
      }
      if (descIdx >= 0) {
        // Description matches rank below any title hit.
        return { event, reason: "description", score: 1000 + descIdx };
      }
      return null;
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_RESULTS);
}
