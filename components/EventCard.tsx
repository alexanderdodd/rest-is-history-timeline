"use client";

import { ERA_BY_ID } from "@/lib/data/eras";
import type { EventWithEpisodes } from "@/lib/episodes-loader";
import type { ClassifiedEpisode } from "@/lib/sync/types";

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

/**
 * Rich card content for a single historical event: cover thumbnail,
 * title, era pill, description, and the full clickable list of matching
 * podcast episodes (each with a short summary).
 *
 * Owns the event/episode → markup mapping. The Timeline component stays
 * content-agnostic — it just renders this wherever the card slot lives.
 */
export default function EventCard({ event }: { event: EventWithEpisodes }) {
  const era = ERA_BY_ID[event.era];
  const ordered = sortEpisodesForDisplay(event.episodes, event.primaryEpisode);
  const cover = event.imageUrl ?? event.primaryEpisode?.thumbnailUrl;
  const primaryUrl = event.primaryEpisode?.url;

  return (
    <>
      {cover &&
        (primaryUrl ? (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ct-cover"
            aria-label={`Watch primary episode for ${event.title}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={event.title} loading="lazy" />
          </a>
        ) : (
          <div className="ct-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={event.title} loading="lazy" />
          </div>
        ))}
      <div className="ct-card-body">
        <h3 className="ct-event-title">
          {primaryUrl ? (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ct-event-title-link"
            >
              {event.title}
            </a>
          ) : (
            event.title
          )}
        </h3>
        <p className="ct-event-meta">
          <span className="ct-event-era">{era?.name ?? event.era}</span>
          {ordered.length > 0 && (
            <>
              <span className="ct-dot-sep" aria-hidden="true">
                •
              </span>
              <span>
                {ordered.length} episode{ordered.length === 1 ? "" : "s"}
              </span>
            </>
          )}
        </p>
        <p className="ct-event-desc">{event.description}</p>
        {ordered.length > 0 && (
          <>
            <h4 className="ct-episodes-heading">
              {ordered.length === 1 ? "Episode" : "Episodes"}
            </h4>
            <ul className="ct-episodes-list">
              {ordered.map((ep) => (
                <li key={ep.youtubeId} className="ct-episode-item">
                  <a
                    href={ep.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ct-episode-link"
                  >
                    <span className="ct-episode-title">{ep.title}</span>
                    {ep.description && (
                      <span className="ct-episode-summary">
                        {truncate(ep.description, 180)}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
