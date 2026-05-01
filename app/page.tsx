import EpisodeCard from "@/components/EpisodeCard";
import EventMarker from "@/components/EventMarker";
import ScrollDepthTracker from "@/components/ScrollDepthTracker";
import SearchBar from "@/components/SearchBar";
import SeriesConnectors from "@/components/SeriesConnectors";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import { EVENTS } from "@/lib/data/events";
import type { HistoricalEvent } from "@/lib/data/types";
import { formatEventDate, formatYearLabel } from "@/lib/dates";
import {
  loadEpisodeGroupsForTimeline,
  loadEpisodesForTimeline,
  type EpisodeGroup,
} from "@/lib/episodes-loader";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en-GB",
    about: {
      "@type": "PodcastSeries",
      name: "The Rest Is History",
      url: "https://www.youtube.com/@restishistorypod",
      author: [
        { "@type": "Person", name: "Tom Holland" },
        { "@type": "Person", name: "Dominic Sandbrook" },
      ],
    },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Curated historical events on the timeline",
    numberOfItems: EVENTS.length,
    itemListElement: EVENTS.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Event",
        name: e.title,
        description: e.description,
        startDate:
          e.year < 0
            ? `-${String(-e.year).padStart(4, "0")}`
            : String(e.year).padStart(4, "0"),
      },
    })),
  };

  return (
    <main className="page">
      <h1 className="sr-only">
        {SITE_NAME}: a visual timeline of human history mapped to The Rest Is
        History podcast episodes
      </h1>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <SearchBar episodes={episodes} />
      <Timeline items={items} overlay={<SeriesConnectors />} />
      <ScrollDepthTracker />
    </main>
  );
}
