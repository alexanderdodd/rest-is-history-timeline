import EpisodeCard from "@/components/EpisodeCard";
import EventMarker from "@/components/EventMarker";
import SearchBar from "@/components/SearchBar";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import { EVENTS } from "@/lib/data/events";
import type { HistoricalEvent } from "@/lib/data/types";
import { formatEventDate, formatYearLabel } from "@/lib/dates";
import {
  loadEpisodeGroupsForTimeline,
  loadEpisodesForTimeline,
  type EpisodeGroup,
} from "@/lib/episodes-loader";

// Re-render at most once an hour. The cron route also calls revalidatePath("/")
// after a sync, so fresh episodes appear without waiting for the timer.
export const revalidate = 3600;

type Row =
  | { kind: "event"; year: number; event: HistoricalEvent }
  | { kind: "episodes"; year: number; group: EpisodeGroup };

function buildRows(
  events: HistoricalEvent[],
  groups: EpisodeGroup[],
): Row[] {
  const rows: Row[] = [
    ...events.map<Row>((event) => ({ kind: "event", year: event.year, event })),
    ...groups.map<Row>((group) => ({ kind: "episodes", year: group.year, group })),
  ];
  rows.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    // Events come before episode groups at the same year so the historical
    // context anchor lands above the show's coverage of it.
    if (a.kind !== b.kind) return a.kind === "event" ? -1 : 1;
    return 0;
  });
  return rows;
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

export default async function Home() {
  const [episodes, groups] = await Promise.all([
    loadEpisodesForTimeline(),
    loadEpisodeGroupsForTimeline(),
  ]);

  const items = buildRows(EVENTS, groups).map(rowToItem);

  return (
    <main className="page">
      <SearchBar episodes={episodes} />
      <Timeline items={items} />
    </main>
  );
}
