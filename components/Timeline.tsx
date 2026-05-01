"use client";

import { Chrono } from "react-chrono";
import { EVENTS } from "@/lib/data/events";
import { ERA_BY_ID } from "@/lib/data/eras";
import { formatEventDate } from "@/lib/dates";
import type { HistoricalEvent } from "@/lib/data/types";

type ChronoItem = {
  title: string;
  cardTitle: string;
  cardSubtitle?: string;
  cardDetailedText: string;
  media?: {
    type: "IMAGE";
    source: { url: string };
  };
};

function toChronoItem(event: HistoricalEvent): ChronoItem {
  const era = ERA_BY_ID[event.era];
  const item: ChronoItem = {
    title: formatEventDate(event.year, event.month, event.day),
    cardTitle: event.title,
    cardSubtitle: era?.name,
    cardDetailedText: event.description,
  };
  if (event.imageUrl) {
    item.media = { type: "IMAGE", source: { url: event.imageUrl } };
  }
  return item;
}

const ITEMS: ChronoItem[] = EVENTS.map(toChronoItem);

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

export default function Timeline() {
  return (
    <div className="timeline-shell">
      <Chrono
        items={ITEMS}
        mode="VERTICAL_ALTERNATING"
        theme={THEME}
        useReadMore
        enableLayoutSwitch={false}
        scrollable={{ scrollbar: false }}
        cardHeight={180}
        contentDetailsHeight={140}
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
