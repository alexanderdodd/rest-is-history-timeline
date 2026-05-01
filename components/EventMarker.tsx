"use client";

import { ERA_BY_ID } from "@/lib/data/eras";
import type { HistoricalEvent } from "@/lib/data/types";

/**
 * Compact "context anchor" for a curated historical event. Visually distinct
 * from EpisodeCard — no thumbnail, no shadow, just a thin accent stripe and
 * tight typography. The point is to orient the reader chronologically while
 * staying out of the way of the show's actual content (episodes).
 *
 * Owns its own outer wrapper + `data-timeline-id` so the Timeline component
 * stays content-agnostic.
 */
export default function EventMarker({ event }: { event: HistoricalEvent }) {
  const era = ERA_BY_ID[event.era];
  return (
    <aside
      data-timeline-id={`event-${event.id}`}
      className="ct-event-marker"
    >
      {era && <p className="ct-event-marker-era">{era.name}</p>}
      <h3 className="ct-event-marker-title">{event.title}</h3>
      <p className="ct-event-marker-desc">{event.description}</p>
    </aside>
  );
}
