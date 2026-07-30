/**
 * Small date-range helper for list filters (kitchen Production, etc.).
 *
 * Everything works in the viewer's LOCAL calendar date as `YYYY-MM-DD`, so
 * "today" means the operator's today. Ranges are inclusive on both ends. "Last
 * week"/"last month" are rolling windows (last 7 / 30 days up to today), not
 * calendar weeks/months.
 */

export type DateRangePreset = "today" | "week" | "month" | "custom" | "single";

export interface DateRange {
  /** Inclusive lower bound, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. */
  to: string;
}

/** The value a date-filter control carries. `from`/`to`/`single` are only read for their preset. */
export interface DateFilterValue {
  preset: DateRangePreset;
  from: string;
  to: string;
  single: string;
}

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  preset: "today",
  from: "",
  to: "",
  single: "",
};

/** A `Date` as a local `YYYY-MM-DD` string. */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The local date of an ISO timestamp; a plain `YYYY-MM-DD` passes through. */
export function localDateOf(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return toLocalDateString(new Date(value));
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
}

/** Resolve a filter value into an inclusive `{ from, to }` range. */
export function resolveDateRange(value: DateFilterValue): DateRange {
  const today = toLocalDateString(new Date());
  switch (value.preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: daysAgo(6), to: today };
    case "month":
      return { from: daysAgo(29), to: today };
    case "single": {
      const day = value.single || today;
      return { from: day, to: day };
    }
    case "custom": {
      const a = value.from || today;
      const b = value.to || today;
      // Tolerate the two dates being entered in either order.
      return a <= b ? { from: a, to: b } : { from: b, to: a };
    }
  }
}

/** Whether a `target_date` or an ISO timestamp falls within the range (inclusive). */
export function isWithinRange(value: string, range: DateRange): boolean {
  const d = localDateOf(value);
  return d >= range.from && d <= range.to;
}
