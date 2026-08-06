/**
 * Phase 7 — Forecasting & Planning.
 *
 * These are back-office (portal-token) contracts, called through `request`
 * directly against the live backend — like menu authoring and proposals, they
 * are NOT part of the mock `ApiClient`. IDs stay numeric here, matching the
 * server JSON (`product_id: 88`) and the POS-adjacent `pos.ts` types, rather
 * than being stringified the way the admin/kitchen portal resources are.
 *
 * The golden rule from the handoff: **decimals come back as strings** ("3.50",
 * "40.000"). Never `parseFloat` and re-render — format for display, keep the
 * string for dirty-checks. See `@/lib/money` for the paisa/decimal helpers.
 */

import type { Minor } from "@/lib/money";

// ---- Event tags (§3a) ----

/**
 * The FIXED tag vocabulary. Render as a multi-select, never free text — adding
 * one needs a backend migration. `GENERAL` is the wildcard: valid only on an
 * event's multiplier list (it lifts every product), never as a product tag.
 */
export const EVENT_TAGS = [
  "IFTAR_ITEM",
  "SEHRI_ITEM",
  "MEAT",
  "RICE",
  "BREAD",
  "BEVERAGE",
  "DESSERT",
  "SNACK",
  "GENERAL",
] as const;

export type EventTag = (typeof EVENT_TAGS)[number];

/** Tags a product may carry — everything except the `GENERAL` wildcard. */
export const PRODUCT_EVENT_TAGS = EVENT_TAGS.filter(
  (t) => t !== "GENERAL",
) as Exclude<EventTag, "GENERAL">[];

export interface EventTagInfo {
  tag: EventTag;
  is_wildcard: boolean;
}

// ---- Calendar events (§4) ----

/** FIXED = national holiday · LUNAR = Hijri-computed · MANUAL = Admin added. */
export type EventSource = "FIXED" | "LUNAR" | "MANUAL";

export interface EventMultiplier {
  tag: EventTag;
  /** Decimal string, e.g. "3.50". */
  multiplier: string;
}

export interface CalendarEvent {
  id: number;
  /** Stable id for generated events; null for manual ones. Match on this, not name. */
  key: string | null;
  name: string;
  source: EventSource;
  starts_on: string;
  ends_on: string;
  /** Lunar dates are a calculation until a human confirms them. Badge it (§4a). */
  is_estimated: boolean;
  /** 0–1 decimal string. How much of the normal weekday pattern still applies (§4b). */
  weekly_factor_weight: string;
  /** null = whole restaurant; otherwise only that branch is affected. */
  branch_id: number | null;
  note: string | null;
  multipliers: EventMultiplier[];
  created_at: string;
}

export interface EventsQuery {
  start?: string;
  end?: string;
  branch_id?: number | string;
}

export interface CreateEventInput {
  name: string;
  starts_on: string;
  ends_on: string;
  weekly_factor_weight: string;
  branch_id?: number | null;
  note?: string | null;
  /** tag → decimal-string multiplier. Replaces the whole set on write. */
  multipliers?: Record<string, string>;
}

export interface UpdateEventInput {
  name?: string;
  starts_on?: string;
  ends_on?: string;
  weekly_factor_weight?: string;
  branch_id?: number | null;
  note?: string | null;
  /** When sent, replaces the whole multiplier set for the event. */
  multipliers?: Record<string, string>;
  /** Accept the computed LUNAR dates as announced without changing them. */
  confirm?: boolean;
}

/** Result of POST /calendar/generate. Safe to re-run; `kept` = human-confirmed left alone. */
export interface GenerateCalendarResult {
  year: number;
  created: number;
  updated: number;
  kept: number;
}

// ---- Per-product event multipliers (§5) ----

export interface ProductMultiplier {
  product_id: number;
  product_name: string;
  multiplier: string;
  /** True = a suggestion awaiting confirmation, not a settled value. Nothing sets it yet. */
  is_proposed: boolean;
}

export interface PutProductMultipliersInput {
  /** product id (as string key) → decimal-string multiplier. */
  multipliers: Record<string, string>;
  is_proposed?: boolean;
  /** Merges by default; `true` clears every product not listed. */
  replace?: boolean;
}

export interface PutProductMultipliersResult {
  event_id: number;
  updated: number;
  products: ProductMultiplier[];
}

// ---- Product forecast setup (§3a, §3b) ----

export interface ProductEventTags {
  product_id: number;
  tags: EventTag[];
}

export interface ExpectedDailySales {
  product_id: number;
  /** Decimal string ("40.000") or null. Send "40"/null; column stores 3 decimals. */
  expected_daily_units: string | null;
}

// ---- Forecast (§6) ----

export type ForecastMaturity =
  | "assumption"
  | "mostly_assumption"
  | "blended"
  | "observed";

export interface ForecastBreakdown {
  baseline: string;
  /** The weekday pattern learned. */
  weekday_factor: string;
  /** The weekday pattern actually used — differs from `weekday_factor` when an event reduced it. */
  weekday_applied: string;
  /** "1.000" means no event affected this product — do not render a "×1" chip. */
  event_multiplier: string;
  before_cap: string;
  /** Result clipped to 0.3×–5× baseline. When true, warn and show both numbers (§6a). */
  was_capped: boolean;
}

export interface ForecastConfidence {
  maturity: ForecastMaturity;
  observed_days: number;
  /** Always "heuristic" today. Display, don't branch on it. */
  engine: string;
  /** True if any contributing event's dates are unconfirmed. */
  dates_estimated: boolean;
}

export interface ForecastEventRef {
  event_id: number;
  name: string;
  multiplier: string;
  /** "product" = this dish's own number · "tag" = its category rule. Show the difference. */
  source: "product" | "tag";
  is_estimated: boolean;
  is_proposed: boolean;
}

/**
 * Shadow "turned-away demand" comparison — DISPLAY ONLY.
 *
 * The forecast deliberately does NOT use this: `is_live` is false and stays
 * false until a developer flips a backend constant and deploys — it never turns
 * on by itself, however much data accumulates. Counting turned-away demand is
 * the only change that makes a forecast *larger*, and an over-forecast wastes
 * food while an under-forecast merely sells out, so it runs in shadow. Render it
 * as an optional comparison, marked not-applied while `is_live` is false, and
 * hide it entirely when `days_with_refusals` is 0. Keep reading `is_live` rather
 * than hardcoding, so nothing breaks the day it flips. Decimals are strings —
 * format with `trimDecimal`, never `parseFloat` + re-render.
 */
export interface ForecastUnmetDemand {
  /** Days in the window where at least one customer was turned away. */
  days_with_refusals: number;
  /** Average turned-away units per day (decimal string). */
  unmet_per_day: string;
  /** What the baseline would be if turned-away demand were counted (decimal string). */
  baseline_if_counted: string;
  /**
   * The suggested units if turned-away demand were counted — whole units, already
   * rounded through the SAME path as `suggested_units` (weekday × event, then cap).
   * Display this directly; the backend computes it so client-side maths can't
   * land on a slightly different number.
   */
  suggested_units_if_counted: number;
  /** The exact decimal behind `suggested_units_if_counted`; tooltip only. */
  units_if_counted: string;
  /** Whether the counted-in figure hit the safety cap (refusals looked noisy). */
  was_capped: boolean;
  /** Whether this feeds the live forecast. Permanently false until a manual deploy. */
  is_live: boolean;
}

export interface ForecastRow {
  product_id: number;
  product_name: string;
  date: string;
  /** The headline number — whole units, already rounded. */
  suggested_units: number;
  /** The exact decimal; tooltip only, don't lead with it. */
  units: string;
  breakdown: ForecastBreakdown;
  confidence: ForecastConfidence;
  events: ForecastEventRef[];
  /** Plain sentences, ready to render as-is. Do not parse. */
  notes: string[];
  /** Shadow turned-away-demand comparison; absent/empty when no refusals in the window. */
  unmet_demand?: ForecastUnmetDemand;
}

export interface ForecastQuery {
  branch_id: number | string;
  start: string;
  /** Defaults to `start` (single day). */
  end?: string;
  product_id?: number | string;
  /** Include products with no history and no expected amount (they can only be zero). */
  include_all?: boolean;
}

export interface HotProduct {
  rank: number;
  product_id: number;
  product_name: string;
  /** The ranking basis. Do NOT sort by revenue — combos understate dish revenue. */
  units: number;
  revenue_minor: Minor;
  from: string;
  to: string;
}

export interface HotProductsQuery {
  /** Omit for the whole restaurant. */
  branch_id?: number | string;
  days?: number;
  limit?: number;
}

export interface UpcomingEventImpact {
  tag: EventTag;
  multiplier: string;
}

export interface UpcomingEvent {
  event_id: number;
  name: string;
  starts_on: string;
  ends_on: string;
  days_away: number;
  /** True once it has started (`days_away` is 0). */
  in_progress: boolean;
  is_estimated: boolean;
  weekly_factor_weight: string;
  /** Sorted biggest-first; `impacts[0]` is the headline. */
  impacts: UpcomingEventImpact[];
  branch_id: number | null;
}

export interface UpcomingEventsQuery {
  branch_id?: number | string;
  within_days?: number;
}

/** Diagnostic (§6 normal-demand): the learned half with no events applied. */
export interface NormalDemandRow {
  product_id: number;
  product_name: string;
  date: string;
  baseline: string;
  /** The measured ratio before trust was applied. */
  weekday_raw: string;
  /** 0–1. */
  weekday_trust: string;
  weekday_applied: string;
  units: string;
  suggested_units: number;
  /** Shadow turned-away-demand comparison; absent/empty when no refusals in the window. */
  unmet_demand?: ForecastUnmetDemand;
}

export interface NormalDemandQuery {
  branch_id: number | string;
  on: string;
  product_id?: number | string;
}

// ---- Plans (§7) ----

export type ForecastPlanStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

/** The line-level breakdown carried on a plan (a subset of the forecast one). */
export interface PlanLineBreakdown {
  baseline: string;
  weekday_applied: string;
  event_multiplier: string;
  was_capped: boolean;
  maturity: ForecastMaturity;
}

export interface PlanLine {
  id: number;
  product_id: number;
  product_name: string;
  date: string;
  /** Never overwritten by an override — kept so the original stays auditable. */
  suggested_units: number;
  planned_units: number;
  is_overridden: boolean;
  override_reason: string | null;
  breakdown: PlanLineBreakdown;
}

export interface ForecastPlan {
  id: number;
  branch_id: number;
  starts_on: string;
  ends_on: string;
  status: ForecastPlanStatus;
  engine: string;
  note: string | null;
  confirmed_at: string | null;
  overridden_lines: number;
  lines: PlanLine[];
}

export interface CreatePlanInput {
  branch_id: number | string;
  start: string;
  /** Defaults to `start`. */
  end?: string;
  note?: string;
}

export interface OverridePlanLineInput {
  line_id: number;
  planned_units: number;
  reason?: string;
}

export interface OverridePlanLinesInput {
  lines: OverridePlanLineInput[];
}

export interface PlanFilters {
  branch_id?: number | string;
  status?: ForecastPlanStatus;
}

// ---- Kitchen planning (§8) ----

export interface KitchenPlanningTarget {
  date: string;
  product_id: number;
  product_name: string;
  /** Summed across branches — one batch for the chain. */
  target_units: number;
  /** How many branches contributed, for a tooltip. */
  branches: number;
}

export interface KitchenPlanningResponse {
  ready: boolean;
  from: string;
  to: string;
  targets: KitchenPlanningTarget[];
}

// ---- Branch planning (§9) ----

export interface BranchExpectedStockRow {
  date: string;
  product_id: number;
  product_name: string;
  expected_units: number;
}

/**
 * Two shapes in one, keyed on `ready`. The empty form carries `forecast: []`
 * (the legacy contract key); the ready form carries `expected_stock`. Never
 * assume one key is always present.
 */
export interface BranchPlanningResponse {
  branch_id: number;
  ready: boolean;
  reason: string | null;
  generated_at: string;
  from?: string;
  to?: string;
  expected_stock?: BranchExpectedStockRow[];
  /** Present (empty) only in the not-ready form. */
  forecast?: unknown[];
}
