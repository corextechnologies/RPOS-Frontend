/**
 * Branch portal wire types (Phase 5).
 *
 * Money here is DECIMAL STRINGS (`"500.00"`), not minor units — these are the
 * older Phase 5 endpoints and they are deliberately unchanged. The POS surface
 * in `@/lib/types/pos` is the one that speaks integers. Never sum across the two.
 */

import type { BranchPosition } from "@/lib/types/super-admin";
import type { StockLocationType } from "@/lib/types/warehouse";

/** Mirrors MISSING_KITCHEN_ASSIGNMENT / MISSING_WAREHOUSE_ASSIGNMENT. */
export const MISSING_BRANCH_ASSIGNMENT = "missing_branch_assignment";

/** A production run needs at least one INPUT and one OUTPUT line. */
export const INVALID_PRODUCTION_RUN = "invalid_production_run";

// ---- Staff ----

/**
 * Creating branch staff.
 *
 * `POST /v1/branch/users` is live but **absent from the wiring guide**, which is
 * why this looked impossible: the guide documents the capability model that
 * depends on `position` without documenting the one endpoint that sets it.
 *
 * Note what's missing from the body: `branch_id` and `role`. Branch comes from
 * the token, and the role is BRANCH_STAFF by construction — this endpoint only
 * makes one kind of user.
 */
export interface CreateBranchStaffInput {
  email: string;
  full_name?: string;
  /**
   * The whole point. Position resolves server-side into the capability list the
   * till gates on, and a staff member without one has an empty capability set —
   * i.e. 403 on everything.
   */
  position: BranchPosition;
}

export interface BranchStaff {
  id: string;
  email: string;
  full_name: string | null;
  position: BranchPosition | null;
  is_active: boolean;
  branch_id?: string;
  created_at?: string;
}

/** Server-generated on create — the only time it is ever shown. */
export interface UpdateBranchStaffInput {
  email?: string;
  full_name?: string;
  position?: BranchPosition;
}

export interface CreateBranchStaffResult {
  user_id: string;
  email: string;
  position: BranchPosition;
  temporary_password?: string | null;
  credential_email_sent?: boolean;
}

// ---- Customers ----

export interface BranchCustomer {
  id: string;
  name: string;
  phone: string | null;
  /** Present since the Phase 5 branch-scoping delta. Read-only to this client. */
  branch_id: string;
  created_at?: string;
}

/**
 * Note what is absent: `branch_id`. Branch comes from the token, never the body
 * — the same class of hole as a country dropdown that picks your tax rate. The
 * field is omitted structurally so it cannot be sent by accident.
 */
export interface CreateBranchCustomerInput {
  name: string;
  phone?: string;
}

export interface UpdateBranchCustomerInput {
  name?: string;
  phone?: string;
}

export interface BranchCustomerFilters {
  /** Matches phone or name, server-side. */
  search?: string;
  page?: number;
  page_size?: number;
}

// ---- Orders ----

export interface BranchOrderLineInput {
  product_id: string;
  quantity: number;
  /**
   * A *proposal*, and optional since the Phase 5 pricing delta. Omit it and the
   * server prices the line. Sending a stale value earns a 409 `price_mismatch`
   * carrying every mismatched line, not just the first.
   */
  unit_price?: string;
}

export interface CreateBranchOrderInput {
  customer_id?: string | null;
  lines: BranchOrderLineInput[];
  note?: string;
}

export interface BranchOrderLine {
  id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface BranchOrder {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  lines: BranchOrderLine[];
  total: string;
  created_at: string;
  note?: string | null;
}

export interface BranchOrderFilters {
  page?: number;
  page_size?: number;
}

// ---- Stock requests (BRANCH_TO_ADMIN) ----
//
// The branch's outgoing ask to head office for stock. The read shape is Admin's
// `StockRequest` (branch and Admin read the same projection); only the create
// input lives here. There is no `branch_id` in the body — the server takes it
// from the token, exactly as customers and orders do.

export interface CreateBranchRequestLineInput {
  product_id: string;
  quantity_requested: number;
}

export interface CreateBranchRequestInput {
  /** The kitchen the branch wants to fulfil this — chosen from a picker. */
  kitchen_id: string;
  notes?: string;
  lines: CreateBranchRequestLineInput[];
}

// ---- Incoming deliveries (from the kitchen) ----
//
// One branch's slice of a kitchen dispatch. The kitchen produced finished goods,
// Admin allocated a quantity to this branch, and the kitchen dispatched it. The
// branch confirms receipt, which credits its stock. `id` is the allocation id —
// the unit the branch receives.

export interface BranchDelivery {
  id: string;
  request_id: string;
  /** The kitchen that dispatched it. */
  from_label: string;
  product_id: string;
  product_name: string;
  quantity: number;
  status: "DISPATCHED" | "RECEIVED";
  created_at: string;
}

// ---- Inventory ----

/**
 * Readable by BRANCH_STAFF since the Phase 5 delta — a salesperson needs to see
 * what has run out. Note there is no `cost_price` field and there must never be
 * one: price is Admin-only and is absent from this shape structurally, not
 * nulled and not hidden with CSS. `tests/pricing-leak.test.ts` enforces it.
 */
export interface BranchInventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  quantity: number;
  /** Empty string means unbatched stock — same convention as the other portals. */
  batch_code: string;
  /** Plain calendar date, `YYYY-MM-DD`. Named to match `InventoryItem`. */
  expiry_date?: string | null;
  location_id: string;
}

// ---- Sub-kitchen production ----

export type ProductionLineRole = "INPUT" | "OUTPUT";

export interface ProductionLineInput {
  product_id: string;
  role: ProductionLineRole;
  quantity: number;
}

/** Needs at least one INPUT and one OUTPUT, or 409 `invalid_production_run`. */
export interface CreateProductionRunInput {
  lines: ProductionLineInput[];
  note?: string;
}

export interface ProductionLine {
  id: string;
  product_id: string;
  product_name?: string;
  role: ProductionLineRole;
  quantity: number;
}

/**
 * A production run — branch sub-kitchen or kitchen alike.
 *
 * ⚠️ **Breaking change:** this used to carry `branch_id`. The branch sub-kitchen
 * and kitchen production now share one ledger, so runs are keyed by location
 * like everything else that touches stock.
 *
 * `recipe_id` is what distinguishes them: `null` for a branch sub-kitchen run,
 * where a human states the inputs and outputs by hand; set for a kitchen run,
 * where a recipe decided them.
 */
export interface ProductionRun {
  id: string;
  location_type: StockLocationType;
  location_id: string;
  /** Null for a hand-stated branch run; set when a recipe drove it. */
  recipe_id: string | null;
  lines: ProductionLine[];
  created_at: string;
  created_by_id?: string;
  note?: string | null;
}

export interface ProductionRunFilters {
  page?: number;
  page_size?: number;
}
