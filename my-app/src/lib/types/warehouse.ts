import { ApiError } from "@/lib/types/super-admin";

// Warehouse (Phase 3) DTOs — mirrors the /v1/warehouse/* backend contract.
//
// Deliberately independent of admin.ts. The two portals disagree on the wire:
// warehouse requests use `request_type`/`line_item_id` where Admin uses
// `type`/`line_id`, and warehouse inventory must never carry a cost price.
// Do NOT widen the Admin types to cover these — the field names differ.

/** All calls are scoped to the caller's warehouse; `warehouse_id` is never sent. */
export type StockLocationType = "WAREHOUSE" | "KITCHEN" | "BRANCH";

/**
 * Product as exposed to the Warehouse portal.
 * Cost price is structurally absent — the Warehouse must never see it, so the
 * field does not exist rather than being hidden at render time.
 */
export interface InventoryProduct {
  id: string;
  name: string;
  sku?: string | null;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  product: InventoryProduct;
  quantity: number;
  /** Empty string means unbatched stock. */
  batch_code: string;
  /** Plain calendar date, `YYYY-MM-DD`. */
  expiry_date?: string | null;
  location_type: StockLocationType;
  location_id: string;
}

/**
 * A staff member created by the signed-in warehouse manager.
 *
 * `GET /warehouse/users` is creator-scoped: it returns only the staff this
 * manager created, never everyone attached to the warehouse. UI copy must not
 * imply otherwise. The API assigns them the WAREHOUSE_MANAGER role.
 */
export interface WarehouseStaff {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  warehouse_id: string;
  created_at?: string;
}

/** Body for `POST /warehouse/users`. */
export interface CreateWarehouseStaffInput {
  email: string;
  full_name?: string;
}

/**
 * Result of `POST /warehouse/users`.
 *
 * Note there is no temporary password here — unlike the Admin equivalent, this
 * endpoint only emails the credentials. Never surface a credentials dialog for
 * this flow; there is nothing to show.
 */
export interface CreateWarehouseStaffResult {
  user_id: string;
  email: string;
  role: string;
  warehouse_id: string;
  credential_email_sent: boolean;
}

/** Body for `POST /warehouse/stock/receive` — incoming stock. */
export interface ReceiveStockInput {
  product_id: string;
  /** Whole units, must be > 0. */
  quantity: number;
  /** Omitted entirely for unbatched stock. */
  batch_code?: string;
  /** `YYYY-MM-DD`. */
  expiry_date?: string;
  notes?: string;
}

/** Body for `POST /warehouse/stock/adjust` — manual correction, up or down. */
export interface AdjustStockInput {
  product_id: string;
  /** Non-zero. Positive adds, negative removes. */
  quantity_delta: number;
  batch_code?: string;
  /** Omitted when blank — the API rejects an empty-but-present value. */
  notes?: string;
}

export type StockMovementType = "WASTE" | "EXPIRY";

/** Body for `POST /warehouse/stock/waste` — write off wasted or expired stock. */
export interface WasteStockInput {
  product_id: string;
  /** Whole units, must be > 0. */
  quantity: number;
  /** Defaults to "WASTE" server-side. */
  movement_type?: StockMovementType;
  batch_code?: string;
  notes?: string;
}

/** Query for `GET /warehouse/inventory/near-expiry`. */
export interface NearExpiryFilters {
  /** Defaults to 7 server-side. Valid range 0–365. */
  within_days?: number;
}

/** 409 raised when a quantity is not greater than zero, or a delta is zero. */
export const INVALID_QUANTITY = "invalid_quantity";

/** 409 raised when a movement would drop on-hand below zero. */
export const INSUFFICIENT_STOCK = "insufficient_stock";

/** 409 raised when a waste movement_type is neither WASTE nor EXPIRY. */
export const INVALID_MOVEMENT_TYPE = "invalid_movement_type";

/**
 * 409 raised when the signed-in warehouse manager has no warehouse assigned.
 * Every /warehouse/* endpoint can return this, so the portal treats it as a
 * first-class state rather than a generic error.
 */
export const MISSING_WAREHOUSE_ASSIGNMENT = "missing_warehouse_assignment";

export function isMissingWarehouseAssignment(error: unknown): boolean {
  return (
    error instanceof ApiError && error.code === MISSING_WAREHOUSE_ASSIGNMENT
  );
}
