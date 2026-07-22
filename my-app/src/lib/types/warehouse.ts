import { ApiError } from "@/lib/types/super-admin";
import type { WasteReason } from "@/lib/stock/waste-reason";
import type { ProductKind } from "@/lib/types/admin";

// Warehouse (Phase 3) DTOs — mirrors the /v1/warehouse/* backend contract.
//
// Deliberately independent of admin.ts. The two portals disagree on the wire:
// warehouse requests use `request_type` where Admin calls the field `type`, and
// warehouse inventory must never carry a cost price.
//
// They agree on more than was once assumed, though: every portal's status PATCH
// shares one `RequestTransition` schema server-side, so `line_item_id` is the
// key everywhere. The old claim that Admin sent `line_id` was a mock-era guess,
// and it was silently wrong against the live API until Phase 4.1.

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
  /**
   * What the product is — `RAW_MATERIAL` or `RESALE`. Set when the warehouse
   * creates it; the warehouse never stocks finished goods, so the field is
   * narrowed to the two kinds it can own (undefined only for legacy rows that
   * predate the field).
   */
  kind?: WarehouseProductKind;
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
/** Body for `PATCH /warehouse/users/{id}`. */
export interface UpdateWarehouseStaffInput {
  email?: string;
  full_name?: string;
}

export interface CreateWarehouseStaffResult {
  user_id: string;
  email: string;
  role: string;
  warehouse_id: string;
  credential_email_sent: boolean;
}

/**
 * A product in the warehouse's catalog.
 *
 * Cost price is structurally absent, exactly as on `InventoryProduct`: the
 * warehouse introduces the product, Admin prices it afterwards, and the
 * warehouse must never see what it cost.
 */
export interface WarehouseProduct {
  id: string;
  name: string;
  sku?: string | null;
  /** Only ever `RAW_MATERIAL` or `RESALE` here — the warehouse buys, it doesn't cook. */
  kind?: WarehouseProductKind;
}

/**
 * The two kinds a warehouse may create.
 *
 * `FINISHED_GOOD` is deliberately absent: the kitchen makes those, and sending
 * one here is a 422. Narrowing the type means the form cannot offer it.
 */
export type WarehouseProductKind = Extract<ProductKind, "RAW_MATERIAL" | "RESALE">;

/** Body for `POST /warehouse/products`. */
export interface CreateWarehouseProductInput {
  /** 1–255 characters. */
  name: string;
  /** Up to 100 characters, unique per restaurant. */
  sku?: string;
  /** Defaults to `RAW_MATERIAL` server-side when omitted. */
  kind?: WarehouseProductKind;
}

export interface WarehouseProductFilters {
  kind?: WarehouseProductKind;
}

/**
 * Body for `PATCH /warehouse/products/{product_id}` — edit catalog metadata.
 *
 * All fields optional: this is a partial update for filling in details the
 * warehouse missed at creation (a name typo, a still-blank SKU). Quantity is
 * deliberately absent — stock lives on `InventoryItem` behind the stock
 * endpoints, so a catalog edit can never move on-hand.
 */
export interface UpdateWarehouseProductInput {
  /** 1–255 characters. */
  name?: string;
  /** Up to 100 characters, unique per restaurant. Send "" to clear it. */
  sku?: string | null;
  kind?: WarehouseProductKind;
}

/** Body for `PUT /warehouse/products/{product_id}/reorder-level`. */
export interface UpdateReorderLevelInput {
  /** >= 0. */
  reorder_level: number;
}

/** Result of `PUT /warehouse/products/{product_id}/reorder-level`. */
export interface ReorderLevel {
  product_id: string;
  location_type: StockLocationType;
  location_id: string;
  reorder_level: number;
}

/**
 * Body for `PATCH /warehouse/inventory/{item_id}` — correct a batch's expiry.
 *
 * Only the expiry date is editable this way; quantity is moved through
 * receive/adjust/waste, never here.
 */
export interface UpdateStockExpiryInput {
  /** `YYYY-MM-DD`, or null to clear it (non-perishable / unbatched stock). */
  expiry_date: string | null;
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
  /**
   * Optional low-stock limit, set while adding the item. Upsert: sending it
   * again updates the limit. Without one, no low-stock alert ever fires.
   */
  reorder_level?: number;
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
  /**
   * Optional on this endpoint (required on the kitchen's), but always sent:
   * waste-rate analytics aggregates on it, so an unreasoned write-off is
   * permanently unreportable. Shared enum — see lib/stock/waste-reason.ts.
   */
  waste_reason?: WasteReason;
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

// ---- Requests ----
// Warehouse-local on purpose. The wire shape differs from Admin's StockRequest:
// `request_type` (not `type`). Do not reuse the Admin request types.

export type WarehouseRequestType = "WAREHOUSE_TO_ADMIN_PO" | "KITCHEN_TO_WAREHOUSE";

/**
 * Purchase orders the warehouse raises to Admin.
 *
 * DISPATCHED replaced IN_QUEUE in Phase 4.1: it means Admin has sent the goods
 * and the warehouse must now either confirm receipt or report a problem.
 * REPORTED credits no stock; RESOLVED is Admin accepting the shortfall so the
 * warehouse can book in what actually arrived.
 */
export type PurchaseOrderStatus =
  | "PENDING"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "DISPATCHED"
  | "REPORTED"
  | "RESOLVED"
  | "RECEIVED";

/** Requests the kitchen raises against this warehouse. */
export type KitchenRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "DISPATCHED"
  | "RECEIVED";

/**
 * The union of both vocabularies.
 *
 * DANGER: DISPATCHED is a member of both and means different things — on a PO,
 * Admin shipped to us; on a kitchen request, we shipped to the kitchen. Never
 * branch on a status from this union without first discriminating on
 * `request_type`.
 */
export type WarehouseRequestStatus = PurchaseOrderStatus | KitchenRequestStatus;

export interface WarehouseRequestLineItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity_requested: number;
  /** Null until Admin approves; a partial approval sets it below requested. */
  quantity_approved?: number | null;
  /** Null until a PO is reported or received. Cumulative for the PO. */
  quantity_received?: number | null;
  /** What was wrong with this line, set by a report. */
  issue_note?: string | null;
}

export interface WarehouseRequest {
  id: string;
  restaurant_id: string;
  request_type: WarehouseRequestType;
  status: WarehouseRequestStatus;
  requester_id: string | null;
  assignee_id: string | null;
  source_location_type: StockLocationType | null;
  source_location_id: string | null;
  target_location_type: StockLocationType | null;
  target_location_id: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  line_items: WarehouseRequestLineItem[];
}

/** Body for `POST /warehouse/requests/po` — at least one line is required. */
export interface CreatePurchaseOrderInput {
  lines: Array<{ product_id: string; quantity_requested: number }>;
  notes?: string;
}

export interface WarehouseRequestFilters {
  status?: WarehouseRequestStatus | "all";
  page?: number;
  page_size?: number;
}

/**
 * Line approval for `PATCH /warehouse/requests/{id}/status`.
 *
 * The key is `line_item_id`, from `line_items[].id` — not `product_id`.
 */
export interface WarehouseLineApproval {
  line_item_id: string;
  quantity_approved: number;
}

/**
 * One line of a PO receipt, for `RECEIVED` or `REPORTED`.
 *
 * `quantity_received` is the CUMULATIVE total received against this PO line, not
 * a per-delivery top-up: on the re-enqueue path the warehouse confirms the whole
 * total once, and stock is credited exactly once at RECEIVED. Label the field
 * accordingly or users will under-book stock.
 *
 * Omitting a line on RECEIVED falls back to its reported or approved quantity —
 * but then it gets no batch or expiry, which hides that stock from near-expiry
 * alerts and expiry labels. Always send one entry per line.
 */
export interface WarehouseLineReceipt {
  /** From `line_items[].id`, not `product_id`. */
  line_item_id: string;
  /** >= 0, and never more than `quantity_approved`. */
  quantity_received: number;
  /** Omitted entirely for unbatched stock. */
  batch_code?: string;
  /** `YYYY-MM-DD`. */
  expiry_date?: string;
  /** Free text describing what was wrong. */
  issue_note?: string;
}

export interface UpdateWarehouseRequestStatusInput {
  to_status: WarehouseRequestStatus;
  line_approvals?: WarehouseLineApproval[];
  /** Required for a PO reaching RECEIVED or REPORTED. */
  line_receipts?: WarehouseLineReceipt[];
  notes?: string;
  assignee_id?: string;
}

/** 409 raised when a status move is not legal for that request type. */
export const INVALID_TRANSITION = "invalid_transition";

/** 409 raised when a PO moves to RECEIVED or REPORTED without any line receipts. */
export const MISSING_LINE_RECEIPTS = "missing_line_receipts";

/** 409 raised when a received quantity exceeds the approved quantity. */
export const INVALID_RECEIVED_QUANTITY = "invalid_received_quantity";

/** 409 raised when a report says nothing is wrong — that is not a report. */
export const NOTHING_REPORTED = "nothing_reported";

/** 409 raised on duplicate SKU when creating a product. */
export const DUPLICATE_SKU = "duplicate_sku";

/** 409 raised when the request moved underneath you — refetch and retry. */
export const STALE_STATUS = "stale_status";

/** 409 raised when a kitchen request has no warehouse target to dispatch from. */
export const MISSING_WAREHOUSE_TARGET = "missing_warehouse_target";

/** 409 raised when a quantity is not greater than zero, or a delta is zero. */
export const INVALID_QUANTITY = "invalid_quantity";

/** 409 raised when a movement would drop on-hand below zero. */
export const INSUFFICIENT_STOCK = "insufficient_stock";

/**
 * `error.details` on a `409 insufficient_stock`. The dispatch check sums a
 * product across all its batches at the source warehouse and consumes them
 * FEFO, so a shortfall now reports what it actually found.
 *
 * `available` counts only **non-expired** batches usable today — dispatch skips
 * expired stock, so this can legitimately be below the raw on-hand total shown
 * in an inventory dump. A request can fail here even when the shelf looks full,
 * if the only stock on hand is past its expiry.
 */
export interface InsufficientStockDetails {
  product_id?: number;
  product_name?: string;
  location_type?: string;
  location_id?: number;
  requested?: number;
  available?: number;
  /**
   * Present only on batch-scoped shortfalls (production input, waste, adjust).
   * When set, `available` is that batch's on-hand, not the product total.
   * Dispatch never sends it — it sums across in-date batches.
   */
  batch_code?: string;
}

/** Narrows an unknown error to the insufficient-stock breakdown, or null. */
export function insufficientStockDetails(
  error: unknown,
): InsufficientStockDetails | null {
  if (!(error instanceof ApiError) || error.code !== INSUFFICIENT_STOCK) {
    return null;
  }
  const details = error.details;
  if (!details || typeof details !== "object") return null;
  return details as InsufficientStockDetails;
}

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
