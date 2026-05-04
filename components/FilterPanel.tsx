"use client";

export type Filters = {
  /** Hide episodes where a guest features prominently. */
  hostsOnly: boolean;
  /** Hide episodes that aren't part of a multi-part series. */
  seriesOnly: boolean;
  /**
   * When set, hide episodes whose YouTube `publishedAt` year is strictly
   * before this. Inclusive of the year itself: `2024` keeps every episode
   * published in 2024 or later. Null means "no filter".
   */
  publishedAfter: number | null;
};

export const DEFAULT_FILTERS: Filters = {
  hostsOnly: false,
  seriesOnly: false,
  publishedAfter: null,
};

/** Years offered in the "Published after" dropdown. The show started late
 *  2020, so 2020 is the earliest meaningful floor. The upper bound tracks
 *  the current year. */
const PUBLISHED_AFTER_FLOOR = 2020;
function publishedYearOptions(): number[] {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now; y >= PUBLISHED_AFTER_FLOOR; y--) out.push(y);
  return out;
}

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
        title="Hide episodes published before this year."
      >
        <span>Published in</span>
        <select
          value={filters.publishedAfter ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...filters,
              publishedAfter: v === "" ? null : Number.parseInt(v, 10),
            });
          }}
        >
          <option value="">Any year</option>
          {publishedYearOptions().map((y) => (
            <option key={y} value={y}>
              {y} or later
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
