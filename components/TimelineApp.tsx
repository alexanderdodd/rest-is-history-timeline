"use client";

import { useEffect, useMemo, useState } from "react";
import EpisodeCard from "@/components/EpisodeCard";
import EventMarker from "@/components/EventMarker";
import { DEFAULT_FILTERS, type Filters } from "@/components/FilterPanel";
import ScrollDepthTracker from "@/components/ScrollDepthTracker";
import SeriesConnectors from "@/components/SeriesConnectors";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import Toolbar from "@/components/Toolbar";
import { formatEventDate, formatYearLabel } from "@/lib/dates";
import type { HistoricalEvent } from "@/lib/data/types";
import type { EpisodeGroup, PositionedEpisode } from "@/lib/episodes-loader";

const STORAGE_KEY = "trih-timeline-filters";

export type Row =
  | { kind: "event"; year: number; event: HistoricalEvent }
  | { kind: "episodes"; year: number; group: EpisodeGroup };

type Props = {
  rows: Row[];
  episodes: PositionedEpisode[];
};

function passes(ep: PositionedEpisode, f: Filters): boolean {
  // Treat undefined as true: pre-v8 entries (or any future schema gap) are
  // assumed hosts-only since the show is hosts-only by default.
  if (f.hostsOnly && ep.hostsOnly === false) return false;
  if (f.seriesOnly && !ep.series) return false;
  if (f.publishedAfter !== null) {
    // ep.publishedAt is ISO ("2024-08-12T..."), so the first 4 chars are
    // the publish year. Inclusive of the threshold year — "2024 or later"
    // keeps everything published in 2024+.
    const epYear = Number.parseInt(ep.publishedAt.slice(0, 4), 10);
    if (Number.isFinite(epYear) && epYear < f.publishedAfter) return false;
  }
  return true;
}

function filterRow(row: Row, f: Filters): Row | null {
  if (row.kind === "event") return row;
  const kept = row.group.episodes.filter((ep) => passes(ep, f));
  if (kept.length === 0) return null;
  return {
    kind: "episodes",
    year: row.year,
    group: { ...row.group, episodes: kept },
  };
}

function rowToItem(row: Row): TimelineItem {
  if (row.kind === "event") {
    const e = row.event;
    return {
      id: `event-${e.id}`,
      dateLabel: formatEventDate(e.year, e.month, e.day),
      content: <EventMarker event={e} />,
      rowClassName: "ct-row-event",
    };
  }
  const compact = row.group.episodes.length > 1;
  return {
    id: `year-${row.group.year}`,
    dateLabel: formatYearLabel(row.group.year),
    content: (
      <div className="ct-episode-stack">
        {row.group.episodes.map((ep) => (
          <EpisodeCard key={ep.youtubeId} episode={ep} compact={compact} />
        ))}
      </div>
    ),
  };
}

/**
 * Owns the toolbar (search + filter controls), filter state, and renders the
 * Timeline with the filtered rows.
 *
 * Filter state is persisted in localStorage under `trih-timeline-filters` so
 * the user's preferences stick across visits. We hydrate on mount via
 * useEffect rather than initialising from localStorage in useState, because
 * the latter would cause a server/client hydration mismatch — server has no
 * localStorage so it would always render with DEFAULT_FILTERS, and a client
 * with saved filters would render a different tree.
 */
export default function TimelineApp({ rows, episodes }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        // Sanitise rather than spread — old keys (e.g. minEpisodeNumber from
        // the previous filter design) shouldn't survive into the live state.
        setFilters({
          hostsOnly: parsed.hostsOnly === true,
          seriesOnly: parsed.seriesOnly === true,
          publishedAfter:
            typeof parsed.publishedAfter === "number" &&
            Number.isFinite(parsed.publishedAfter) &&
            parsed.publishedAfter > 0
              ? parsed.publishedAfter
              : null,
        });
      }
    } catch {
      // Ignore — bad JSON or storage disabled is fine.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore — storage disabled / quota exceeded.
    }
  }, [filters, hydrated]);

  const filteredEpisodes = useMemo(
    () => episodes.filter((ep) => passes(ep, filters)),
    [episodes, filters],
  );

  const items = useMemo(() => {
    const filteredRows = rows
      .map((r) => filterRow(r, filters))
      .filter((r): r is Row => r !== null);
    return filteredRows.map(rowToItem);
  }, [rows, filters]);

  // Filter state is part of the connector layout key — when filters change,
  // the set of visible series cards changes, and we want the SVG paths
  // recomputed against the new DOM.
  const connectorKey = `${filters.hostsOnly}|${filters.seriesOnly}|${filters.publishedAfter ?? ""}`;

  return (
    <>
      <Toolbar
        filters={filters}
        onFiltersChange={setFilters}
        episodes={filteredEpisodes}
      />
      <Timeline
        items={items}
        overlay={<SeriesConnectors key={connectorKey} />}
      />
      <ScrollDepthTracker />
    </>
  );
}
