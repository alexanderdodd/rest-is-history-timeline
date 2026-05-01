"use client";

import type { ReactNode } from "react";

export type TimelineItem = {
  /** Unique React key for this row. */
  id: string;
  /** Label rendered next to the spine. The timeline doesn't parse it. */
  dateLabel: string;
  /** Whatever React node should appear inside the card slot. Opaque to the timeline. */
  content: ReactNode;
  /**
   * Optional class applied to the outer `.ct-row` element so callers can
   * style row-level chrome (e.g. give the marker dot a different look for
   * historical-event rows). The timeline itself stays content-agnostic.
   */
  rowClassName?: string;
};

/**
 * Generic vertical-alternating timeline. Pure presentation — no knowledge
 * of events, episodes, or any specific content domain. Callers compose it
 * with a `TimelineItem[]` whose `content` is whatever they want to render
 * inside each card.
 */
export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="ct-timeline">
      <div className="ct-spine" aria-hidden="true" />
      {items.map((item, i) => {
        const side = i % 2 === 0 ? "left" : "right";
        return (
          <div
            key={item.id}
            className={`ct-row ct-${side}${item.rowClassName ? ` ${item.rowClassName}` : ""}`}
          >
            {/* The card slot is just a positional wrapper. The content owns
                its own card markup and `data-timeline-id` — so groups can
                stack multiple cards in one row without sharing an id. */}
            <div className="ct-card-slot">{item.content}</div>
            <div className="ct-marker">
              <div className="ct-marker-dot" aria-hidden="true" />
              <div className="ct-marker-date">{item.dateLabel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
