"use client";

import { Chrono } from "react-chrono";
import { ERA_BY_ID } from "@/lib/data/eras";
import { formatEventDate } from "@/lib/dates";
import type { EventWithEpisodes } from "@/lib/episodes-loader";

type ChronoItem = {
  title: string;
  cardTitle: string;
  cardSubtitle?: string;
  cardDetailedText: string;
  url?: string;
  media?: {
    type: "IMAGE";
    source: { url: string };
    name?: string;
  };
};

function toChronoItem(event: EventWithEpisodes): ChronoItem {
  const era = ERA_BY_ID[event.era];
  const ep = event.primaryEpisode;
  const extraEpisodes = Math.max(0, event.episodes.length - 1);

  const subtitle = ep
    ? `${era?.name ?? event.era} • ${extraEpisodes > 0 ? `${event.episodes.length} episodes` : "1 episode"}`
    : era?.name;

  const detailParts = [event.description];
  if (ep) detailParts.push(`▸ ${ep.title}`);
  if (extraEpisodes > 0) {
    detailParts.push(`+ ${extraEpisodes} more episode${extraEpisodes > 1 ? "s" : ""}`);
  }

  const item: ChronoItem = {
    title: formatEventDate(event.year, event.month, event.day),
    cardTitle: event.title,
    cardSubtitle: subtitle,
    cardDetailedText: detailParts.join("\n\n"),
    url: ep?.url,
  };

  const cover = event.imageUrl ?? ep?.thumbnailUrl;
  if (cover) {
    item.media = {
      type: "IMAGE",
      source: { url: cover },
      name: event.title,
    };
  }
  return item;
}

const THEME = {
  primary: "#d4a85a",
  secondary: "#1b1e29",
  cardBgColor: "#14161e",
  cardForeColor: "#e7eaf3",
  cardTitleColor: "#ffffff",
  cardSubtitleColor: "#9aa0b3",
  cardDetailsColor: "#c8ccd8",
  titleColor: "#e7eaf3",
  titleColorActive: "#0c0d12",
  iconBackgroundColor: "#1b1e29",
};

export default function Timeline({ events }: { events: EventWithEpisodes[] }) {
  const items = events.map(toChronoItem);

  return (
    <div className="timeline-shell">
      <Chrono
        items={items}
        mode="VERTICAL_ALTERNATING"
        theme={THEME}
        useReadMore
        enableLayoutSwitch={false}
        scrollable={{ scrollbar: false }}
        cardHeight={200}
        contentDetailsHeight={160}
        fontSizes={{
          cardSubtitle: "0.8rem",
          cardText: "0.95rem",
          cardTitle: "1.15rem",
          title: "0.95rem",
        }}
        classNames={{
          card: "rh-card",
          cardMedia: "rh-card-media",
          cardSubTitle: "rh-card-subtitle",
          cardText: "rh-card-text",
          cardTitle: "rh-card-title",
          controls: "rh-controls",
          title: "rh-title",
        }}
      />
    </div>
  );
}
