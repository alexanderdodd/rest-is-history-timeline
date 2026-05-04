import TimelineApp, { type Row } from "@/components/TimelineApp";
import { EVENTS } from "@/lib/data/events";
import type { HistoricalEvent } from "@/lib/data/types";
import {
  loadEpisodeGroupsForTimeline,
  loadEpisodesForTimeline,
  type EpisodeGroup,
} from "@/lib/episodes-loader";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Re-render at most once an hour. The cron route also calls revalidatePath("/")
// after a sync, so fresh episodes appear without waiting for the timer.
export const revalidate = 3600;

function buildRows(events: HistoricalEvent[], groups: EpisodeGroup[]): Row[] {
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

export default async function Home() {
  const [episodes, groups] = await Promise.all([
    loadEpisodesForTimeline(),
    loadEpisodeGroupsForTimeline(),
  ]);

  const rows = buildRows(EVENTS, groups);

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
      <TimelineApp rows={rows} episodes={episodes} />
    </main>
  );
}
