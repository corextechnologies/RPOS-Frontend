import { ApiError } from "@/lib/types/super-admin";

// Kitchen (Phase 4) DTOs — mirrors the /v1/kitchen/* backend contract.
//
// Deliberately independent of warehouse.ts and admin.ts, for the same reason
// those two are independent of each other: the portals disagree on the wire.
// The warehouse's KitchenRequestStatus describes its own side of the exchange
// and stops at RECEIVED; the kitchen additionally drives IN_PRODUCTION →
// PRODUCED → ALLOCATED on a request type the warehouse never sees. Reusing
// either file's request types would couple three portals to one vocabulary.

/** All calls are scoped to the caller's kitchen; `kitchen_id` is never sent. */
export type KitchenLocationType = "BRANCH" | "KITCHEN" | "WAREHOUSE";

export type WasteReason =
  | "SPOILAGE"
  | "EXPIRED"
  | "DAMAGED"
  | "OVERPRODUCTION"
  | "PREP_ERROR"
  | "OTHER";

export type KitchenMovementType = "WASTE" | "EXPIRY";

/**
 * Product as exposed to the Kitchen portal.
 * Cost price is structurally absent — procurement cost is Admin-only, so the
 * field does not exist rather than being hidden at render time.
 */
export interface KitchenProduct {
  id: string;
  name: string;
  sku?: string | null;
}

/**
 * One row per product *and* batch: the same product appears several times with
 * different batch codes. Key lists on `id`, never `product_id`.
 */
export interface KitchenInventoryItem {
  id: string;
  product_id: string;
  product: KitchenProduct;
  quantity: number;
  /** Empty string means unbatched stock. Render it as "No batch", not blank. */
  batch_code: string;
  /** Plain calendar date, `YYYY-MM-DD`. */
  expiry_date?: string | null;
  location_type: KitchenLocationType;
  location_id: string;
}

/** Query for `GET /kitchen/inventory/near-expiry`. */
export interface KitchenNearExpiryFilters {
  /** Defaults to 7 server-side. Valid range 0–365. */
  within_days?: number;
}

/** Sticker data for `GET /kitchen/inventory/labels`. Rows with 0 on-hand are excluded. */
export interface KitchenLabel {
  product_id: string;
  product_name: string;
  sku?: string | null;
  batch_code: string;
  expiry_date?: string | null;
  quantity: number;
  location_type: KitchenLocationType;
  location_id: string;
}

/** Both filters are optional; a non-matching batch returns an empty list, not a 404. */
export interface KitchenLabelFilters {
  product_id?: string;
  batch_code?: string;
}

/**
 * Body for `POST /kitchen/stock/waste`.
 *
 * Note `waste_reason` is required here, unlike the Warehouse's waste endpoint
 * where it is optional — do not copy the warehouse schema across.
 */
export interface KitchenWasteInput {
  product_id: string;
  /** Whole units, always > 0. The server subtracts; never send a negative. */
  quantity: number;
  waste_reason: WasteReason;
  /** Defaults to "WASTE" server-side. */
  movement_type?: KitchenMovementType;
  /** Must match the batch exactly. Omitted entirely for unbatched stock. */
  batch_code?: string;
  notes?: string;
}

// ---- Stock counts ----

/** One line of `POST /kitchen/stock/counts`. */
export interface KitchenCountLineInput {
  product_id: string;
  /** >= 0. */
  counted_quantity: number;
  /** Omitted for unbatched stock. */
  batch_code?: string;
}

/** Body for `POST /kitchen/stock/counts` — at least one line is required. */
export interface CreateKitchenCountInput {
  notes?: string;
  lines: KitchenCountLineInput[];
}

export interface KitchenCountLine {
  id: string;
  product_id: string;
  product_name: string;
  batch_code: string | null;
  counted_quantity: number;
  system_quantity: number;
  /** Counted minus system. Negative is missing stock, positive is a surplus. */
  variance: number;
}

/**
 * A submitted count. This is not only a report: any non-zero variance writes a
 * stock adjustment, corrects on-hand to the counted number, and notifies Admin.
 * Confirm before submitting one.
 */
export interface KitchenStockCount {
  id: string;
  location_type: KitchenLocationType;
  location_id: string;
  counted_by_id: string | null;
  notes?: string | null;
  created_at: string;
  lines: KitchenCountLine[];
}

export interface KitchenCountFilters {
  page?: number;
  page_size?: number;
}

// ---- Staff ----

/**
 * A sub-chef created by the signed-in kitchen manager.
 *
 * `GET /kitchen/users` is creator-scoped: it returns only the staff this manager
 * created, never everyone attached to the kitchen. Another manager seeing an
 * empty list is correct. UI copy must not imply otherwise.
 */
export interface KitchenStaff {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  kitchen_id: string;
  created_at?: string;
}

/** Body for `POST /kitchen/users`. */
export interface CreateKitchenStaffInput {
  email: string;
  full_name?: string;
}

/**
 * Result of `POST /kitchen/users`.
 *
 * There is no password here — the endpoint emails the credentials and never
 * returns them. Never surface a credentials dialog for this flow; there is
 * nothing to show. When `credential_email_sent` is false the user still exists,
 * and there is no resend endpoint to offer.
 */
export interface CreateKitchenStaffResult {
  user_id: string;
  email: string;
  role: string;
  kitchen_id: string;
  credential_email_sent: boolean;
}

// ---- Requests ----

/**
 * A warehouse this kitchen may pull stock from, via `GET /kitchen/warehouses`.
 *
 * The shape currently matches Admin's `Warehouse` exactly, but this stays a
 * kitchen-local type on the same principle as everything else in this file: the
 * portals project the same entities differently, and importing Admin's DTO here
 * is the coupling that would be hard to unpick when they diverge.
 */
export interface KitchenWarehouse {
  id: string;
  restaurant_id: string;
  name: string;
  /** Free text, and often absent. */
  location?: string | null;
  created_at?: string;
}

export type KitchenRequestType = "KITCHEN_TO_WAREHOUSE" | "BRANCH_TO_ADMIN";

/** Stock the kitchen asks a warehouse for. No partial approval on this type. */
export type KitchenWarehouseRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "DISPATCHED"
  | "RECEIVED";

/** Branch requests Admin forwarded to this kitchen. */
export type KitchenBranchRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_APPROVED"
  | "FORWARDED_TO_KITCHEN"
  | "IN_PRODUCTION"
  | "PRODUCED"
  | "ALLOCATED"
  | "RECEIVED";

export type KitchenRequestStatus =
  | KitchenWarehouseRequestStatus
  | KitchenBranchRequestStatus;

export interface KitchenRequestLineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity_requested: number;
  /**
   * Stays null for the whole KITCHEN_TO_WAREHOUSE lifecycle — that type has no
   * partial approval. Display `quantity_approved ?? quantity_requested`.
   */
  quantity_approved?: number | null;
}

export interface KitchenRequest {
  id: string;
  restaurant_id: string;
  request_type: KitchenRequestType;
  status: KitchenRequestStatus;
  requester_id: string | null;
  assignee_id: string | null;
  source_location_type: KitchenLocationType | null;
  source_location_id: string | null;
  target_location_type: KitchenLocationType | null;
  target_location_id: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  line_items: KitchenRequestLineItem[];
}

/**
 * Body for `POST /kitchen/requests/warehouse`.
 *
 * `warehouse_id` is required — a restaurant may run several, and this picks
 * which one gets debited. There is no kitchen-facing endpoint listing them yet.
 */
export interface CreateKitchenWarehouseRequestInput {
  warehouse_id: string;
  notes?: string;
  lines: Array<{ product_id: string; quantity_requested: number }>;
}

export interface KitchenRequestFilters {
  status?: KitchenRequestStatus | "all";
  page?: number;
  page_size?: number;
}

/** Body for `PATCH /kitchen/requests/{id}/status`. */
export interface UpdateKitchenRequestStatusInput {
  to_status: KitchenRequestStatus;
  notes?: string;
}

// ---- Error codes ----

/** 409 raised when a status move is not legal for that request type. */
export const KITCHEN_INVALID_TRANSITION = "invalid_transition";

/**
 * 409 raised when the request moved underneath you. Expected on a shared kitchen
 * screen — refetch and re-render rather than showing an error.
 */
export const KITCHEN_STALE_STATUS = "stale_status";

/** 409 raised when a batch holds less than the requested quantity. */
export const KITCHEN_INSUFFICIENT_STOCK = "insufficient_stock";

/** 409 raised when one call repeats a product_id + batch_code pair. */
export const KITCHEN_DUPLICATE_COUNT_LINE = "duplicate_count_line";

/** 409 raised when an email is already taken. */
export const KITCHEN_CONFLICT = "conflict";

/**
 * 409 raised when the signed-in kitchen user has no kitchen assigned. Every
 * /kitchen/* endpoint can return this, so the portal treats it as a first-class
 * state rather than a generic error.
 */
export const MISSING_KITCHEN_ASSIGNMENT = "missing_kitchen_assignment";

export function isMissingKitchenAssignment(error: unknown): boolean {
  return error instanceof ApiError && error.code === MISSING_KITCHEN_ASSIGNMENT;
}

/** True when a waste write-off found the batch but it held too little. */
export function isInsufficientStock(error: unknown): boolean {
  return error instanceof ApiError && error.code === KITCHEN_INSUFFICIENT_STOCK;
}

/**
 * True when no inventory row exists for that product/batch at all.
 *
 * Distinct from `isInsufficientStock`: this is the common outcome of a mistyped
 * batch code, and deserves "No stock found for that product/batch" rather than a
 * generic not-found message.
 */
export function isNoSuchStock(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isStaleStatus(error: unknown): boolean {
  return error instanceof ApiError && error.code === KITCHEN_STALE_STATUS;
}
