/**
 * Phase 7 — the event calendar, per-product multipliers, and the per-product
 * forecast-setup fields (event tags + expected daily sales).
 *
 * Admin-only `/v1/admin/*` routes, portal token, called via `request` directly
 * (not the mock contract) — like menu authoring and proposals. Every route here
 * is 403 for a non-Admin.
 */
import type {
  CalendarEvent,
  CreateEventInput,
  EventTagInfo,
  EventsQuery,
  ExpectedDailySales,
  GenerateCalendarResult,
  ProductEventTags,
  ProductMultiplier,
  PutProductMultipliersInput,
  PutProductMultipliersResult,
  UpdateEventInput,
  EventTag,
} from "@/lib/types/forecast";
import { request } from "./client";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const calendarApi = {
  // ---- Tags (§3a) ----

  /** The fixed tag vocabulary. Also available as the EVENT_TAGS constant. */
  getTags(): Promise<EventTagInfo[]> {
    return request<EventTagInfo[]>("/admin/calendar/tags");
  },

  // ---- Events (§4) ----

  /** Defaults to the next 90 days when start/end are omitted. */
  listEvents(query: EventsQuery = {}): Promise<CalendarEvent[]> {
    return request<CalendarEvent[]>(
      `/admin/calendar/events${qs({ ...query })}`,
    );
  },

  createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return request<CalendarEvent>("/admin/calendar/events", {
      method: "POST",
      ...json(input),
    });
  },

  /** All fields optional. `multipliers` replaces the whole set; `confirm` accepts computed dates. */
  updateEvent(eventId: number, input: UpdateEventInput): Promise<CalendarEvent> {
    return request<CalendarEvent>(`/admin/calendar/events/${eventId}`, {
      method: "PATCH",
      ...json(input),
    });
  },

  /** MANUAL events only — a built-in returns 409 `builtin_event_not_deletable`. */
  deleteEvent(eventId: number): Promise<void> {
    return request(`/admin/calendar/events/${eventId}`, { method: "DELETE" });
  },

  // ---- Generate the year (§3c) ----

  /** Safe to re-run — `kept` counts events a human had confirmed. */
  generate(year: number): Promise<GenerateCalendarResult> {
    return request<GenerateCalendarResult>("/admin/calendar/generate", {
      method: "POST",
      ...json({ year }),
    });
  },

  // ---- Per-product multipliers (§5) ----

  getProductMultipliers(eventId: number): Promise<ProductMultiplier[]> {
    return request<ProductMultiplier[]>(
      `/admin/calendar/events/${eventId}/product-multipliers`,
    );
  },

  /** Merges by default; `replace: true` clears every product not listed. */
  putProductMultipliers(
    eventId: number,
    input: PutProductMultipliersInput,
  ): Promise<PutProductMultipliersResult> {
    return request<PutProductMultipliersResult>(
      `/admin/calendar/events/${eventId}/product-multipliers`,
      { method: "PUT", ...json(input) },
    );
  },

  /** Remove a product's own number so it falls back to its tag. */
  deleteProductMultiplier(eventId: number, productId: number): Promise<void> {
    return request(
      `/admin/calendar/events/${eventId}/product-multipliers/${productId}`,
      { method: "DELETE" },
    );
  },

  // ---- Product forecast setup (§3a, §3b) ----

  getProductEventTags(productId: number): Promise<ProductEventTags> {
    return request<ProductEventTags>(`/admin/products/${productId}/event-tags`);
  },

  /** PUT replaces the whole set — send the complete list; [] clears all tags. */
  putProductEventTags(productId: number, tags: EventTag[]): Promise<ProductEventTags> {
    return request<ProductEventTags>(`/admin/products/${productId}/event-tags`, {
      method: "PUT",
      ...json({ tags }),
    });
  },

  getExpectedDailySales(productId: number): Promise<ExpectedDailySales> {
    return request<ExpectedDailySales>(
      `/admin/products/${productId}/expected-daily-sales`,
    );
  },

  /** Send a decimal string ("40") or null to clear. Comes back as "40.000". */
  putExpectedDailySales(
    productId: number,
    expectedDailyUnits: string | null,
  ): Promise<ExpectedDailySales> {
    return request<ExpectedDailySales>(
      `/admin/products/${productId}/expected-daily-sales`,
      { method: "PUT", ...json({ expected_daily_units: expectedDailyUnits }) },
    );
  },
};
