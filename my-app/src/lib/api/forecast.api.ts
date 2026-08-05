/**
 * Phase 7 — the read-only forecast surface: the main table, hot products,
 * upcoming events (the planning-screen alert strip) and the normal-demand
 * diagnostic. Admin-only `/v1/admin/forecast*` routes, portal token.
 */
import type {
  ForecastQuery,
  ForecastRow,
  HotProduct,
  HotProductsQuery,
  NormalDemandQuery,
  NormalDemandRow,
  UpcomingEvent,
  UpcomingEventsQuery,
} from "@/lib/types/forecast";
import { request } from "./client";

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const forecastApi = {
  /** One row per product per day. `branch_id` and `start` required; `end` defaults to `start`. */
  forecast(query: ForecastQuery): Promise<ForecastRow[]> {
    return request<ForecastRow[]>(`/admin/forecast${qs({ ...query })}`);
  },

  /** Ranked by units (not revenue). Omit `branch_id` for the whole restaurant. */
  hotProducts(query: HotProductsQuery = {}): Promise<HotProduct[]> {
    return request<HotProduct[]>(`/admin/forecast/hot-products${qs({ ...query })}`);
  },

  /** The planning-screen alert strip. `impacts` sorted biggest-first. */
  upcomingEvents(query: UpcomingEventsQuery = {}): Promise<UpcomingEvent[]> {
    return request<UpcomingEvent[]>(
      `/admin/forecast/upcoming-events${qs({ ...query })}`,
    );
  },

  /** Diagnostic: the learned half without events applied. Optional tuning view. */
  normalDemand(query: NormalDemandQuery): Promise<NormalDemandRow[]> {
    return request<NormalDemandRow[]>(
      `/admin/forecast/normal-demand${qs({ ...query })}`,
    );
  },
};
