"use client";

import { formatYearLabel } from "@/lib/dates";
import type { PositionedEpisode } from "@/lib/episodes-loader";

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

function dateRangeLabel(ep: PositionedEpisode): string {
  const c = ep.covers[0];
  if (!c) return "";
  if (c.startYear === c.endYear) return formatYearLabel(c.startYear);
  return `${formatYearLabel(c.startYear)} – ${formatYearLabel(c.endYear)}`;
}

/**
 * Card content for a single classified episode plotted on the timeline.
 * Pure content — knows nothing about the timeline structure (Timeline.tsx
 * owns layout). Same shape as EventCard so swapping content types later is
 * cheap.
 */
export default function EpisodeCard({ episode }: { episode: PositionedEpisode }) {
  return (
    <>
      {episode.thumbnailUrl && (
        <a
          href={episode.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ct-cover"
          aria-label={`Watch ${episode.title} on YouTube`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={episode.thumbnailUrl} alt={episode.title} loading="lazy" />
        </a>
      )}
      <div className="ct-card-body">
        <h3 className="ct-event-title">
          <a
            href={episode.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-event-title-link"
          >
            {episode.title}
          </a>
        </h3>
        <p className="ct-event-meta">
          <span className="ct-event-era">{dateRangeLabel(episode)}</span>
        </p>
        {episode.description && (
          <p className="ct-event-desc">{truncate(episode.description, 240)}</p>
        )}
      </div>
    </>
  );
}
