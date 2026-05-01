/**
 * Date helpers for the wide BC→AD range. The Date constructor adds 1900 to
 * year arguments 0-99, so we always go through setFullYear.
 */
export function dateForYear(year: number, month = 1, day = 1): Date {
  const d = new Date(2000, 0, 1);
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Format a year as "3000 BC" / "AD 800" / "1789". */
export function formatYearLabel(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year > 0 && year < 1000) return `AD ${year}`;
  return String(year);
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatEventDate(year: number, month?: number, day?: number): string {
  const yearStr = formatYearLabel(year);
  if (month === undefined) return yearStr;
  const monthStr = MONTHS[month - 1] ?? "";
  if (day === undefined) return `${monthStr} ${yearStr}`;
  return `${day} ${monthStr} ${yearStr}`;
}
