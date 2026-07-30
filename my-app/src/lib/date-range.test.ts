import { describe, expect, it } from "vitest";
import {
  isWithinRange,
  localDateOf,
  resolveDateRange,
  toLocalDateString,
} from "./date-range";

describe("date-range", () => {
  const today = toLocalDateString(new Date());

  it("today is a single-day inclusive range", () => {
    const r = resolveDateRange({ preset: "today", from: "", to: "", single: "" });
    expect(r).toEqual({ from: today, to: today });
  });

  it("last week and last month span back from today", () => {
    const week = resolveDateRange({ preset: "week", from: "", to: "", single: "" });
    const month = resolveDateRange({ preset: "month", from: "", to: "", single: "" });
    expect(week.to).toBe(today);
    expect(month.to).toBe(today);
    expect(week.from < week.to).toBe(true);
    // A month reaches further back than a week.
    expect(month.from < week.from).toBe(true);
  });

  it("a specific date collapses to one day", () => {
    const r = resolveDateRange({
      preset: "single",
      from: "",
      to: "",
      single: "2026-07-29",
    });
    expect(r).toEqual({ from: "2026-07-29", to: "2026-07-29" });
  });

  it("a custom range tolerates the two dates in either order", () => {
    const forward = resolveDateRange({
      preset: "custom",
      from: "2026-07-30",
      to: "2026-09-30",
      single: "",
    });
    const reversed = resolveDateRange({
      preset: "custom",
      from: "2026-09-30",
      to: "2026-07-30",
      single: "",
    });
    expect(forward).toEqual({ from: "2026-07-30", to: "2026-09-30" });
    expect(reversed).toEqual({ from: "2026-07-30", to: "2026-09-30" });
  });

  it("checks membership inclusively and reads the date off a timestamp", () => {
    const range = { from: "2026-07-30", to: "2026-09-30" };
    expect(isWithinRange("2026-07-30", range)).toBe(true); // lower bound
    expect(isWithinRange("2026-09-30", range)).toBe(true); // upper bound
    expect(isWithinRange("2026-07-29", range)).toBe(false);
    expect(isWithinRange("2026-10-01", range)).toBe(false);
    // A local-time timestamp is compared by its calendar date.
    expect(localDateOf("2026-08-15T12:00:00")).toBe("2026-08-15");
    expect(isWithinRange("2026-08-15T12:00:00", range)).toBe(true);
  });
});
