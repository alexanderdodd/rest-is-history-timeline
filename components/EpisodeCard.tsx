"use client";

import { formatEventDate, formatYearLabel } from "@/lib/dates";
import type { PositionedEpisode } from "@/lib/episodes-loader";

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

function dateRangeLabel(ep: PositionedEpisode): string {
  const c = ep.covers[0];
  if (!c) return "";
  const start = formatEventDate(c.startYear, c.startMonth, c.startDay);
  const sameYear = c.startYear === c.endYear;
  const sameDate =
    sameYear && c.startMonth === c.endMonth && c.startDay === c.endDay;
  if (sameDate) return start;
  if (sameYear && !c.endMonth && !c.startMonth) return formatYearLabel(c.startYear);
  const end = formatEventDate(c.endYear, c.endMonth, c.endDay);
  return `${start} – ${end}`;
}

function seriesBadgeText(ep: PositionedEpisode): string | null {
  if (!ep.series) return null;
  const { topic, seriesNumber, partNumber, totalParts } = ep.series;
  const partLabel = totalParts
    ? `Part ${partNumber} of ${totalParts}`
    : `Part ${partNumber}`;
  return `${topic}: Series ${seriesNumber} - ${partLabel}`;
}

/** URL-safe slug of a string — used for the topic component of series ids. */
export function seriesSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Stable id for a specific (topic, seriesNumber) pair — drives connector grouping. */
function seriesIdFor(series: { topic: string; seriesNumber: number }): string {
  return `${seriesSlug(series.topic)}-s${series.seriesNumber}`;
}

/**
 * Card content for a single classified episode plotted on the timeline.
 *
 * Owns its own `<article class="ct-card">` wrapper plus a `data-timeline-id`
 * — so the Timeline component can stay content-agnostic and so the search
 * bar can jump to a specific episode (not just the year row).
 *
 * `compact` switches to a horizontal mini-card layout used when several
 * episodes share the same year and we want to save vertical space.
 */
export default function EpisodeCard({
  episode,
  compact = false,
}: {
  episode: PositionedEpisode;
  compact?: boolean;
}) {
  return (
    <article
      data-timeline-id={episode.youtubeId}
      data-series-id={episode.series ? seriesIdFor(episode.series) : undefined}
      data-series-part={episode.series ? episode.series.partNumber : undefined}
      className={`ct-card${compact ? " ct-card-compact" : ""}${episode.series ? " ct-card-in-series" : ""}`}
    >
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
        {seriesBadgeText(episode) && (
          <p className="ct-series-badge">{seriesBadgeText(episode)}</p>
        )}
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
        {!compact && episode.description && (
          <p className="ct-event-desc">{truncate(episode.description, 240)}</p>
        )}
      </div>
    </article>
  );
}
