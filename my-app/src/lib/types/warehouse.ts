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
