"use client";

export type Filters = {
  /** Hide episodes where a guest features prominently. */
  hostsOnly: boolean;
  /** Hide episodes that aren't part of a multi-part series. */
  seriesOnly: boolean;
  /**
   * Hide numbered standalone episodes whose number is at or below this
   * threshold — for skipping the older, jankier early episodes. Zero means
   * "no filter". Episodes WITHOUT a leading number (named series episodes,
   * archive re-uploads) are unaffected by this filter.
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
      <label className="filter-number">
        <span>Hide numbered ≤</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          placeholder="0"
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
