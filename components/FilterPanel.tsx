"use client";

export type Filters = {
  /** Hide episodes where a guest features prominently. */
  hostsOnly: boolean;
  /** Hide episodes that aren't part of a multi-part series. */
  seriesOnly: boolean;
  /**
   * When > 0, show ONLY numbered episodes whose leading "232." style number
   * is strictly greater than this. Both numbered episodes ≤ N and every
   * unnumbered episode are hidden — the user explicitly asked for "only
   * numbered episodes higher than x". Zero means "no filter".
   */
  minEpisodeNumber: number;
};

export const DEFAULT_FILTERS: Filters = {
  hostsOnly: false,
  seriesOnly: false,
  minEpisodeNumber: 0,
};

type Props = {
  filters: Filters;
  onChange: (next: Filters) => void;
};

export default function FilterPanel({ filters, onChange }: Props) {
  return (
    <div className="filter-panel" role="group" aria-label="Timeline filters">
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={filters.hostsOnly}
          onChange={(e) => onChange({ ...filters, hostsOnly: e.target.checked })}
        />
        <span>Tom and Dominic only (no guests)</span>
      </label>
      <label className="filter-toggle">
        <input
          type="checkbox"
          checked={filters.seriesOnly}
          onChange={(e) => onChange({ ...filters, seriesOnly: e.target.checked })}
        />
        <span>Series only</span>
      </label>
      <label
        className="filter-number"
        title="When set, hides every episode without a leading number AND every numbered episode at or below this value."
      >
        <span>Show only numbered &gt;</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          placeholder="off"
          value={filters.minEpisodeNumber || ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange({ ...filters, minEpisodeNumber: 0 });
              return;
            }
            const n = Number.parseInt(raw, 10);
            onChange({
              ...filters,
              minEpisodeNumber: Number.isFinite(n) && n > 0 ? n : 0,
            });
          }}
        />
      </label>
    </div>
  );
}
