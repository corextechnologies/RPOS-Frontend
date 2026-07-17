import { describe, expect, it } from "vitest";
import { daysAgo, windowDays, windowTooLarge, ymd } from "./use-pos-feed";

/**
 * The feed's 400-day cap.
 *
 * Worth testing because the bug it prevents is invisible: a window computed
 * with local dates drifts by a day across a DST boundary, so a "400 day" range
 * silently becomes 401 and the server 409s — twice a year, in one timezone, for
 * reasons nobody can reproduce.
 */

describe("windowDays", () => {
  it("counts inclusively — one day is one day, not zero", () => {
    expect(windowDays("2026-07-17", "2026-07-17")).toBe(1);
    expect(windowDays("2026-07-17", "2026-07-18")).toBe(2);
  });

  it("counts a year", () => {
    expect(windowDays("2026-01-01", "2026-12-31")).toBe(365);
    // 2028 is a leap year.
    expect(windowDays("2028-01-01", "2028-12-31")).toBe(366);
  });

  /**
   * Pakistan doesn't observe DST, but the app ships to UAE too and the browser
   * uses the *device's* zone, not the branch's. UTC parsing sidesteps it.
   */
  it("is unaffected by a DST boundary", () => {
    // Europe/London springs forward on 2026-03-29.
    expect(windowDays("2026-03-28", "2026-03-30")).toBe(3);
  });

  it("returns 0 on junk rather than NaN", () => {
    expect(windowDays("nonsense", "2026-07-17")).toBe(0);
    expect(windowDays("", "")).toBe(0);
  });
});

describe("windowTooLarge", () => {
  it("allows exactly the cap", () => {
    expect(windowDays("2026-01-01", "2027-02-04")).toBe(400);
    expect(windowTooLarge("2026-01-01", "2027-02-04")).toBe(false);
  });

  it("rejects one day over — the server would 409", () => {
    expect(windowDays("2026-01-01", "2027-02-05")).toBe(401);
    expect(windowTooLarge("2026-01-01", "2027-02-05")).toBe(true);
  });

  it("allows an ordinary range", () => {
    expect(windowTooLarge("2026-07-01", "2026-07-31")).toBe(false);
  });
});

describe("ymd", () => {
  it("zero-pads", () => {
    expect(ymd(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(ymd(new Date(2026, 11, 31))).toBe("2026-12-31");
  });

  it("uses the local calendar date, which is what a branch means by 'today'", () => {
    // Constructed local; must not shift a day via UTC.
    expect(ymd(new Date(2026, 6, 17))).toBe("2026-07-17");
  });
});

describe("daysAgo", () => {
  it("produces a parseable date in the past", () => {
    const start = daysAgo(30);
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(windowDays(start, ymd(new Date()))).toBe(31);
  });
});
