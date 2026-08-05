/**
 * Sub-Kitchen — the branch final-prep station.
 *
 * A prep board of tickets the branch Chef works: made-to-order jobs that arrive
 * from the POS (`source: "ORDER"`, with the customer's note) and the chef's own
 * prep-ahead jobs (`source: "BATCH"`). Completing a ticket moves branch stock —
 * a BATCH adds the finished item back, an ORDER does not (it went to the guest).
 *
 * These are branch PORTAL routes (`/v1/branch/sub-kitchen/*`), served with the
 * caller's portal token — not the POS device token. Read ids are normalized to
 * strings the way every other portal read model is.
 */

import type { ProductKind } from "@/lib/types/admin";
import type { StockUnit } from "@/lib/stock-unit";

// ---- Products (the recipe pickers' source) ----

/**
 * A product the chef can reference — the "what am I making" finished goods and
 * the "what is it made of" raw materials. From `/branch/sub-kitchen/products`,
 * whose `id` is a real product id (never a menu_item_id). Cost is never exposed.
 */
export interface SubKitchenProduct {
  id: string;
  name: string;
  sku: string | null;
  kind: ProductKind;
  stock_unit: StockUnit;
  units_per_pack?: number | null;
  pack_size?: number | null;
}

export interface SubKitchenProductFilters {
  /** `FINISHED_GOOD` for the made-item picker, `RAW_MATERIAL` for components. */
  kind?: ProductKind;
  /**
   * Widen the ingredients list to the whole catalogue, for setting up a recipe
   * before its components have ever been delivered. Only relaxes the
   * `RAW_MATERIAL` filter — `FINISHED_GOOD` is never branch-scoped.
   */
  all?: boolean;
}

// ---- Prep tickets / board ----

export type PrepSource = "ORDER" | "BATCH";

export type PrepStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

/**
 * The statuses the `/status` endpoint may set. COMPLETED is deliberately absent
 * — it moves stock, so it has its own endpoint (409 `use_complete_endpoint`).
 */
export type PrepStatusTarget = "IN_PROGRESS" | "READY" | "CANCELLED";

export interface PrepTicket {
  id: string;
  branch_id: string;
  source: PrepSource;
  status: PrepStatus;
  product_id: string;
  product_name: string;
  quantity: number;
  /** The customer's request on an ORDER ticket (e.g. the name to write on a cake). */
  customization_note: string | null;
  note: string | null;
  order_id: string | null;
  order_line_id: string | null;
  production_run_id: string | null;
  recipe_id: string | null;
  /** Higher works first; then soonest `due_at`; then oldest. */
  priority: number;
  due_at: string | null;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface PrepBoardFilters {
  /** Omit for the working board (QUEUED + IN_PROGRESS + READY). */
  status?: PrepStatus;
  page?: number;
  page_size?: number;
}

/** Body for `POST /branch/sub-kitchen/batch` — only product + quantity required. */
export interface CreateBatchInput {
  product_id: number;
  quantity: number;
  batch_code?: string | null;
  expiry_date?: string | null;
  customization_note?: string | null;
  note?: string | null;
  priority?: number;
  due_at?: string | null;
}

/** Body for `PATCH /branch/sub-kitchen/tickets/{id}/status`. */
export interface UpdatePrepStatusInput {
  status: PrepStatusTarget;
}

/** One hand-stated input for a no-recipe completion. */
export interface CompleteInputLine {
  product_id: number;
  quantity: number;
  batch_code?: string | null;
}

/**
 * Body for `POST /branch/sub-kitchen/tickets/{id}/complete`. Empty for the
 * recipe-driven case; `inputs` for a one-off with no recipe. `batch_code` /
 * `expiry_date` override what the ticket was created with.
 */
export interface CompleteTicketInput {
  inputs?: CompleteInputLine[];
  batch_code?: string | null;
  expiry_date?: string | null;
}

// ---- Stock the station works from ----

/**
 * The station's own view of branch stock (`/sub-kitchen/inventory`). Same rows
 * as `/branch/inventory` underneath — and the same `BranchInventoryItem` shape —
 * but served inside the sub-kitchen namespace, so a chef never has to reach into
 * the branch manager's surface to see what's on the shelf. Cost is not exposed.
 */
export interface SubKitchenNearExpiryFilters {
  /** Rows expiring within this many days (default 7). */
  within_days?: number;
}

/*
 * There is no manual 86 here. The server derives availability from branch stock
 * — an item at zero on hand stops being sellable on the till by itself — so the
 * only "sold out" this station shows is an on-hand figure of zero, read from the
 * inventory endpoints above. (`/pos/availability` is a separate, device-facing
 * surface for pulling an in-stock item; not this station's job.)
 */

// ---- Stats (the sub-kitchen overview) ----

export interface SubKitchenStats {
  start: string;
  end: string;
  items_prepped: number;
  tickets_completed: number;
  waste_events: number;
  waste_quantity: number;
  /** Null until an order-sourced ticket has been worked. Render as minutes. */
  avg_order_to_ready_seconds: number | null;
  /** Live, not window-bound. */
  open_tickets: number;
  tickets_created: Record<PrepStatus, number>;
}

export interface SubKitchenStatsFilters {
  /** `YYYY-MM-DD`. Defaults to the last 7 days. */
  start?: string;
  end?: string;
}

// ---- Error codes (409) ----

/** COMPLETED can't be set via `/status`; it moves stock and has its own endpoint. */
export const PREP_USE_COMPLETE_ENDPOINT = "use_complete_endpoint";
/** A status hop the prep flow doesn't allow. */
export const PREP_INVALID_TRANSITION = "invalid_prep_transition";
/** The ticket is already completed or cancelled. */
export const PREP_NOT_OPEN = "prep_not_open";
/** A branch-only endpoint hit by a non-chef/manager position. */
export const PREP_POSITION_FORBIDDEN = "position_forbidden";
