"use client";

import { useQuery } from "@tanstack/react-query";
import { FEED_MAX_DAYS, posAdminApi } from "@/lib/api/pos-admin.api";
import type { FeedWindow } from "@/lib/types/pos";

export const feedKeys = {
  sales: (w: FeedWindow) => ["pos-feed-sales", w.start, w.end] as const,
  waste: (w: FeedWindow) => ["pos-feed-waste", w.start, w.end] as const,
  snapshot: ["pos-feed-snapshot"] as const,
};

/** `YYYY-MM-DD`, which is what the feed's `start`/`end` want. */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

/**
 * Days between two `YYYY-MM-DD` strings, inclusive.
 *
 * Date-only maths on purpose: `new Date("2026-01-01")` is UTC midnight, and
 * subtracting two of those is exact. Doing this with local `Date` objects would
 * drift by a day across a DST boundary — which is how a 400-day window becomes
 * a 401-day 409 that nobody can reproduce.
 */
export function windowDays(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** True when the server would answer 409 `window_too_large`. */
export function windowTooLarge(start: string, end: string): boolean {
  return windowDays(start, end) > FEED_MAX_DAYS;
}

/**
 * The window is validated client-side before asking. Not because the server
 * can't be trusted to answer 409 — it will — but because a 409 the UI could
 * have predicted is a round trip that only ever produces an error message.
 */
export function useSalesHistory(w: FeedWindow, enabled = true) {
  return useQuery({
    queryKey: feedKeys.sales(w),
    queryFn: () => posAdminApi.salesHistory(w),
    enabled: enabled && !windowTooLarge(w.start, w.end),
    retry: false,
  });
}

export function useWasteHistory(w: FeedWindow, enabled = true) {
  return useQuery({
    queryKey: feedKeys.waste(w),
    queryFn: () => posAdminApi.wasteHistory(w),
    enabled: enabled && !windowTooLarge(w.start, w.end),
    retry: false,
  });
}

export function useInventorySnapshot(enabled = true) {
  return useQuery({
    queryKey: feedKeys.snapshot,
    queryFn: () => posAdminApi.inventorySnapshot(),
    enabled,
    retry: false,
  });
}
