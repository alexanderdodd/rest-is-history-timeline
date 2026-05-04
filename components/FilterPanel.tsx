"use client";

export type Filters = {
  /** Hide episodes where a guest features prominently. */
  hostsOnly: boolean;
  /** Hide episodes that aren't part of a multi-part series. */
  seriesOnly: boolean;
  /**
   * When set, hide episodes whose YouTube `publishedAt` is strictly before
   * this date. Stored as a `YYYY-MM-DD` string (the format produced by
   * `<input type="date">`). Null means "no filter". String comparison
   * against the ISO `publishedAt` is correct for our purposes — the filter
   * value has no time component, so `ep.publishedAt < filterValue` is
   * lexicographically equivalent to "published before midnight UTC on the
   * filter date".
   */
  publishedAfter: string | null;
};

export const DEFAULT_FILTERS: Filters = {
  hostsOnly: false,
  seriesOnly: false,
  publishedAfter: null,
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
        className="filter-date"
        title="Hide episodes published before this date."
      >
        <span>Published after</span>
        <input
          type="date"
          value={filters.publishedAfter ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              publishedAfter: e.target.value || null,
            })
          }
        />
      </label>
    </div>
  );
}
