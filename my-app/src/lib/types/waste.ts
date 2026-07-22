import type { WasteReason } from "@/lib/stock/waste-reason";
import type { StockMovementType } from "@/lib/types/warehouse";

// Waste & expiry write-off history.
//
// A waste event is the persisted record of a write-off: what was thrown away,
// how much, why, and whether it was ordinary waste or an expiry. Both portals
// read the same shape — the Warehouse sees its own events, Admin sees every
// location's — so unlike most DTOs here this one is shared, in the same spirit
// as the shared `WasteReason` enum it carries.

export type WasteLocationType = "WAREHOUSE" | "KITCHEN" | "BRANCH";

/**
 * Product on a waste record — the product's **current** name/SKU, not a
 * write-off-time snapshot. A later rename shows the new name on historical rows,
 * matching the warehouse/admin behaviour already in use. The UI only displays
 * these, so it does not rely on frozen values.
 */
export interface WasteEventProduct {
  id: string;
  name: string;
  sku?: string | null;
}

export interface WasteEvent {
  id: string;
  product_id: string;
  product: WasteEventProduct;
  /** Whole units written off. Always > 0. */
  quantity: number;
  /** Ordinary waste, or stock removed because it expired. */
  movement_type: StockMovementType;
  /** Why it was written off. Optional on the wire, but effectively always set. */
  waste_reason?: WasteReason | null;
  /** Empty string for unbatched stock. */
  batch_code: string;
  notes?: string | null;
  location_type: WasteLocationType;
  location_id: string;
  /** ISO timestamp of the write-off. */
  created_at: string;
  /** Display name of whoever wrote it off, when the API resolves one. */
  created_by?: string | null;
}

export interface WasteEventFilters {
  movement_type?: StockMovementType;
  /** Admin only — the Warehouse endpoint is already scoped to one warehouse. */
  location_type?: WasteLocationType;
  location_id?: string;
}

/**
 * Body for `PATCH /warehouse/stock/waste/{event_id}` — correct a past write-off.
 *
 * A partial update: only the fields sent change. Editing `quantity` re-syncs the
 * batch's on-hand (correcting a write-off up removes more, down returns some),
 * so a mistaken write-off can be fixed without a separate adjustment.
 */
export interface UpdateWasteEventInput {
  /** Whole units, > 0. */
  quantity?: number;
  movement_type?: StockMovementType;
  waste_reason?: WasteReason | null;
  notes?: string | null;
}
