"use client";

import { useEffect, useMemo, useRef } from "react";
import { Chrono } from "react-chrono";
import { ERA_BY_ID } from "@/lib/data/eras";
import { formatEventDate } from "@/lib/dates";
import type { EventWithEpisodes } from "@/lib/episodes-loader";
import type { ClassifiedEpisode } from "@/lib/sync/types";

type ChronoItem = {
  title: string;
  // Kept only as a fallback if react-chrono ever decides not to render
  // children for some item — the real card body is the EventCard.
  cardTitle: string;
  media?: {
    type: "IMAGE";
    source: { url: string };
    name?: string;
  };
};

function toChronoItem(event: EventWithEpisodes): ChronoItem {
  const item: ChronoItem = {
    title: formatEventDate(event.year, event.month, event.day),
    cardTitle: event.title,
  };
  const cover = event.imageUrl ?? event.primaryEpisode?.thumbnailUrl;
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

function sortEpisodesForDisplay(
  episodes: ClassifiedEpisode[],
  primary: ClassifiedEpisode | undefined,
): ClassifiedEpisode[] {
  // Primary first, then by publishedAt ascending so a "Part 1, 2, 3..." series
  // reads in publish order. Falls back to alphabetical on identical dates.
  const rest = episodes.filter((e) => e !== primary);
  rest.sort((a, b) => {
    const byDate = a.publishedAt.localeCompare(b.publishedAt);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });
  return primary ? [primary, ...rest] : rest;
}

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

function EventCard({ event }: { event: EventWithEpisodes }) {
  const ordered = sortEpisodesForDisplay(event.episodes, event.primaryEpisode);
  const era = ERA_BY_ID[event.era];
  const primaryUrl = event.primaryEpisode?.url;

  return (
    <div className="rh-event-detail" data-event-id={event.id}>
      <h3 className="rh-event-title">
        {primaryUrl ? (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rh-event-title-link"
          >
            {event.title}
          </a>
        ) : (
          event.title
        )}
      </h3>
      <p className="rh-event-subtitle">
        <span className="rh-event-era">{era?.name ?? event.era}</span>
        {ordered.length > 0 && (
          <>
            <span className="rh-event-dot" aria-hidden="true">•</span>
            <span>
              {ordered.length} episode{ordered.length === 1 ? "" : "s"}
            </span>
          </>
        )}
      </p>
      <p className="rh-event-desc">{event.description}</p>
      {ordered.length > 0 && (
        <>
          <h4 className="rh-episodes-heading">
            {ordered.length === 1 ? "Episode" : `${ordered.length} episodes`}
          </h4>
          <ul className="rh-episodes-list">
            {ordered.map((ep) => (
              <li key={ep.youtubeId} className="rh-episode-item">
                <a
                  href={ep.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rh-episode-link"
                >
                  <span className="rh-episode-title">{ep.title}</span>
                  {ep.description && (
                    <span className="rh-episode-summary">
                      {truncate(ep.description, 160)}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function Timeline({ events }: { events: EventWithEpisodes[] }) {
  const items = useMemo(() => events.map(toChronoItem), [events]);
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Map thumbnail src → episode URL so we can route clicks on the rendered
  // <img> elements back to YouTube. react-chrono renders images without any
  // URL binding; we use event delegation rather than mutating its DOM tree.
  const thumbToUrl = useMemo(() => {
    const map = new Map<string, string>();
    for (const ev of events) {
      const ep = ev.primaryEpisode;
      if (ep?.thumbnailUrl && ep?.url) map.set(ep.thumbnailUrl, ep.url);
    }
    return map;
  }, [events]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || thumbToUrl.size === 0) return;

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      // Don't hijack clicks on real anchors (episode links inside the card).
      if (target?.closest("a")) return;
      const img = target?.closest("img") as HTMLImageElement | null;
      if (!img) return;
      const url = thumbToUrl.get(img.src) ?? thumbToUrl.get(img.currentSrc);
      if (!url) return;
      e.preventDefault();
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    }

    shell.addEventListener("click", onClick);
    return () => {
      shell.removeEventListener("click", onClick);
    };
  }, [thumbToUrl]);

  return (
    <div className="timeline-shell" ref={shellRef}>
      <Chrono
        items={items}
        mode="VERTICAL_ALTERNATING"
        theme={THEME}
        enableLayoutSwitch={false}
        // Let the page (document) scroll, not react-chrono's internal
        // overflow container — otherwise wheel events are trapped when
        // the cursor is over the timeline.
        scrollable={false}
        cardHeight={240}
        fontSizes={{
          cardSubtitle: "0.78rem",
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
      >
        {events.map((ev) => (
          <EventCard key={ev.id} event={ev} />
        ))}
      </Chrono>
    </div>
  );
}
