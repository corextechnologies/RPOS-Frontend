/**
 * Phase 7 — plans, the part that actually ships. A draft is the Admin thinking
 * aloud; confirming turns a suggestion into a target that branch and kitchen
 * managers see. Admin-only `/v1/admin/plans*` routes, portal token.
 *
 * Named `forecast-plans` to stay clear of the billing-subscription "plans"
 * (`@/lib/plans`, `@/components/plans`) — a different concept entirely.
 */
import type {
  CreatePlanInput,
  ForecastPlan,
  OverridePlanLinesInput,
  PlanFilters,
} from "@/lib/types/forecast";
import { request } from "./client";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const forecastPlansApi = {
  /** Newest first (by `starts_on` descending). */
  listPlans(filters: PlanFilters = {}): Promise<ForecastPlan[]> {
    return request<ForecastPlan[]>(`/admin/plans${qs({ ...filters })}`);
  },

  getPlan(planId: number): Promise<ForecastPlan> {
    return request<ForecastPlan>(`/admin/plans/${planId}`);
  },

  /** Runs the forecast and stores it as an editable DRAFT. `end` defaults to `start`. */
  createPlan(input: CreatePlanInput): Promise<ForecastPlan> {
    return request<ForecastPlan>("/admin/plans", { method: "POST", ...json(input) });
  },

  /** Send only the lines that changed. Drafts only — a confirmed plan 409s. */
  overrideLines(planId: number, input: OverridePlanLinesInput): Promise<ForecastPlan> {
    return request<ForecastPlan>(`/admin/plans/${planId}/lines`, {
      method: "PATCH",
      ...json(input),
    });
  },

  /** The moment a suggestion becomes a target. Cannot be undone by editing. */
  confirmPlan(planId: number): Promise<ForecastPlan> {
    return request<ForecastPlan>(`/admin/plans/${planId}/confirm`, { method: "POST" });
  },

  /** Withdraws it — Kitchen and Branch stop seeing it immediately. Record is kept. */
  cancelPlan(planId: number): Promise<ForecastPlan> {
    return request<ForecastPlan>(`/admin/plans/${planId}/cancel`, { method: "POST" });
  },
};
