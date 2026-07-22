// Admin (Phase 2) DTOs — mirrors the /v1/admin/* backend contract.
// Kept separate from super-admin.ts. Do NOT modify Super Admin types.

import type { BranchPosition } from "@/lib/types/super-admin";

// ---- Locations ----
export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  location?: string | null;
  created_at?: string;
}

export interface Kitchen {
  id: string;
  restaurant_id: string;
  name: string;
  location?: string | null;
  created_at?: string;
}

export interface Warehouse {
  id: string;
  restaurant_id: string;
  name: string;
  location?: string | null;
  created_at?: string;
}

export interface CreateLocationInput {
  name: string;
  location?: string;
}

export interface UpdateLocationInput {
  name?: string;
  location?: string;
}

// ---- Users / employees ----
export type AdminCreatableRole =
  | "BRANCH_MANAGER"
  | "KITCHEN_MANAGER"
  | "WAREHOUSE_MANAGER";

export interface CreateAdminUserInput {
  email: string;
  full_name: string;
  role: AdminCreatableRole;
  branch_id?: string;
  kitchen_id?: string;
  warehouse_id?: string;
}

export interface CreateAdminUserResult {
  user_id: string;
  email: string;
  role: AdminCreatableRole;
  credential_email_sent: boolean;
  temporary_password?: string;
}

export interface UpdateAdminUserInput {
  full_name?: string;
  is_active?: boolean;
  branch_id?: string;
  kitchen_id?: string;
  warehouse_id?: string;
}

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  role: string;
}

export interface UpdateAdminProfileInput {
  full_name?: string;
  image_url?: string;
}

export interface SalesRecord {
  id: string;
  restaurant_id: string;
  branch_id?: string | null;
  amount: string;
  occurred_at: string;
  note?: string | null;
  created_at: string;
}

export interface CreateSaleInput {
  amount: string | number;
  occurred_at?: string;
  branch_id?: string;
  note?: string;
}

export interface SalesRecordFilters {
  branch_id?: string;
  page?: number;
  page_size?: number;
}

export type SalesPeriod = "daily" | "weekly" | "monthly";

export interface SalesSummaryBucket {
  period_start: string;
  total_amount: string;
  count: number;
}

export interface SalesSummary {
  period: SalesPeriod;
  buckets: SalesSummaryBucket[];
  total_amount: string;
  total_count: number;
}

export interface SalesSummaryFilters {
  period?: SalesPeriod;
  start?: string;
  end?: string;
  branch_id?: string;
}

export interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  branch_id?: string | null;
  kitchen_id?: string | null;
  warehouse_id?: string | null;
  /**
   * BRANCH_STAFF only. The server resolves it into the capability list the POS
   * gates on, so a staff member without one is 403'd on everything — see
   * `POST /v1/branch/users`.
   */
  position?: BranchPosition | null;
  created_at?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

// ---- Pricing ----
/**
 * What a product *is*, which decides what may be done to it.
 *
 * Before this existed, flour and a burger were the same kind of row — so every
 * product offered a sell price, and the menu picker offered the warehouse's
 * flour. The kind is the fix, and it encodes the actual flow:
 *
 * - `RAW_MATERIAL` — Warehouse creates it, the kitchen consumes it. Never sold.
 * - `FINISHED_GOOD` — the Kitchen creates it and makes it from a recipe. Sold.
 * - `RESALE` — bought and sold untouched (bottled cola). Nobody makes it, so it
 *   has no recipe, but it is still sellable. It exists precisely because a
 *   bottled drink is neither a raw material nor something the kitchen makes.
 */
export type ProductKind = "RAW_MATERIAL" | "FINISHED_GOOD" | "RESALE";

export interface ProductPricing {
  id: string; // product_id
  name: string;
  sku?: string | null;
  kind: ProductKind;
  /**
   * `FINISHED_GOOD` or `RESALE`. Derived from `kind` server-side — read this
   * rather than re-deriving it, so there is one rule and not two.
   *
   * When false, the selling-price and availability fields must be **removed
   * from the UI, not disabled**: they are meaningless for a sack of flour, and
   * the server 409s `product_not_sellable` on any attempt anyway.
   */
  is_sellable: boolean;
  /** Applies to everything — we buy raw materials, we just never sell them. */
  cost_price: string | null; // decimal string, like billing amounts
  /**
   * What the customer pays. Always null when `is_sellable` is false.
   *
   * Decimal string for the same reason as `cost_price`: parsing money to a
   * float loses precision. The POS surface uses integer minor units instead —
   * see `@/lib/money`.
   */
  selling_price: string | null;
  category: string | null;
  is_available: boolean;
}

export interface ProductPricingFilters {
  /** True narrows to products with no price yet — Admin's pricing queue. */
  unpriced?: boolean;
  /** Splits the catalogue into what we buy vs what we sell. */
  kind?: ProductKind;
  /** `FINISHED_GOOD` + `RESALE` only. */
  sellable_only?: boolean;
}

/**
 * Admin's view of stock across every location.
 *
 * This is the ONLY inventory shape carrying `cost_price`. The Warehouse and
 * Kitchen equivalents omit the field structurally rather than nulling it, so the
 * separation is enforced by the type system and not by remembering to hide a
 * column. Do not widen those types to reuse this one.
 */
export interface AdminInventoryProduct {
  id: string;
  name: string;
  sku?: string | null;
  /** Decimal string, e.g. "1.20". Null until Admin prices it. */
  cost_price: string | null;
  /**
   * What the product is — raw material, resale, or made in-house. Admin sees
   * every location, so any of the three can appear here. Undefined only for
   * legacy rows that predate the field.
   */
  kind?: ProductKind;
}

export interface AdminInventoryItem {
  id: string;
  product_id: string;
  product: AdminInventoryProduct;
  quantity: number;
  /** Empty string means unbatched stock. */
  batch_code: string;
  expiry_date?: string | null;
  location_type: AdminLocationType;
  location_id: string;
}

export type AdminLocationType = "BRANCH" | "KITCHEN" | "WAREHOUSE";

export interface AdminInventoryFilters {
  location_type?: AdminLocationType;
  location_id?: string;
}

/**
 * A PATCH, and the distinction matters: **an omitted key leaves the field
 * alone; an explicit `null` clears it.** So this must be built from the form's
 * *dirty* fields, not from its values — react-hook-form hands you every
 * registered field by default, and sending `category: null` on every save would
 * quietly wipe the category off the whole catalogue.
 */
export interface UpdateProductPricingInput {
  cost_price?: number | string | null; // >= 0
  selling_price?: number | string | null; // >= 0
  category?: string | null;
  is_available?: boolean;
}

// ---- Requests ----

/**
 * Every request type Admin can READ.
 *
 * KITCHEN_TO_WAREHOUSE became readable in Phase 4.1 — `GET /admin/requests/{id}`
 * used to 404 on one. Admin oversees that loop but never actions it: the PATCH
 * still answers 403, and ADMIN_REQUEST_TRANSITIONS deliberately has no entry for
 * this type, so the action panel renders read-only by construction rather than
 * by remembering to hide buttons.
 */
export type AdminRequestType =
  | "BRANCH_TO_ADMIN"
  | "WAREHOUSE_TO_ADMIN_PO"
  | "KITCHEN_TO_WAREHOUSE"
  // A kitchen telling Admin which produced goods are ready to dispatch. Admin
  // approves by allocating each product's quantity across one or more branches.
  | "KITCHEN_TO_ADMIN";

/**
 * The full request vocabulary Admin can read.
 *
 * PRODUCED and ALLOCATED are driven by the Kitchen portal and never appear in
 * Admin's transition map, but a forwarded request comes back through Admin's
 * read screens carrying them, so they must parse here.
 *
 * DISPATCHED replaced IN_QUEUE in Phase 4.1. Note it is ambiguous across request
 * types — on a PO it means Admin sent the goods to the warehouse, on a kitchen
 * request it means the warehouse shipped to the kitchen. Always discriminate on
 * the request type before acting on it.
 */
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_APPROVED"
  | "FORWARDED_TO_KITCHEN"
  | "DISPATCHED"
  | "REPORTED"
  | "RESOLVED"
  | "IN_PRODUCTION"
  | "PRODUCED"
  | "ALLOCATED"
  | "RECEIVED";

export interface RequestLineItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity_requested: number;
  quantity_approved?: number | null;
  /** Null until a PO is reported or received. */
  quantity_received?: number | null;
  /** What was wrong with this line, set by a warehouse report. */
  issue_note?: string | null;
}

/**
 * Where a single branch allocation is in the hand-off. The kitchen dispatches
 * the whole request at once (all allocations → DISPATCHED); each branch then
 * confirms its own → RECEIVED independently, so statuses can differ per branch.
 */
export type AllocationStatus = "ALLOCATED" | "DISPATCHED" | "RECEIVED";

/**
 * One product's quantity earmarked for one branch, produced when Admin allocates
 * a KITCHEN_TO_ADMIN dispatch request. A single request line can fan out into
 * several of these (40 buns → 25 Downtown + 15 Gulberg).
 */
export interface RequestBranchAllocation {
  id: string;
  line_item_id: string;
  product_id?: string;
  product_name: string;
  branch_id: string;
  branch_name: string;
  quantity: number;
  status: AllocationStatus;
}

export interface StockRequest {
  id: string;
  type: AdminRequestType;
  status: RequestStatus;
  notes?: string | null;
  from_label?: string; // branch/warehouse name for UI
  /**
   * Origin of the request. The backend fills `from_label` for branch/kitchen
   * requests but leaves it empty on a WAREHOUSE_TO_ADMIN_PO, so the UI falls
   * back to resolving the name from these against the warehouse list.
   */
  source_location_type?: AdminLocationType | null;
  source_location_id?: string | null;
  line_items: RequestLineItem[];
  /** Present on KITCHEN_TO_ADMIN once Admin has allocated it across branches. */
  allocations?: RequestBranchAllocation[];
  created_at: string;
  updated_at?: string;
}

export interface RequestFilters {
  status?: RequestStatus | "all";
  page?: number;
  page_size?: number;
}

/**
 * The key is `line_item_id` and it comes from `line_items[].id` — not
 * `product_id`.
 *
 * This said `line_id` until Phase 4.1. That was a mock-era assumption: every
 * portal's status PATCH shares one `RequestTransition` schema server-side, so
 * Admin sends exactly what the Warehouse sends, and `line_id` was silently
 * wrong against the live API.
 */
export interface LineApproval {
  line_item_id: string;
  quantity_approved: number;
}

/**
 * Where a forwarded request is being sent. Only kitchens can receive one, so the
 * type is a single literal rather than a location union — sending a warehouse or
 * branch is rejected by the API (`invalid_kitchen_target`) and is better made
 * unrepresentable here than validated at runtime.
 */
export interface ForwardTarget {
  target_location_type: "KITCHEN";
  target_location_id: string;
}

export interface UpdateRequestStatusInput {
  to_status: RequestStatus;
  line_approvals?: LineApproval[];
  notes?: string;
  assignee_id?: string;
  /**
   * Required when `to_status` is FORWARDED_TO_KITCHEN, ignored otherwise. The
   * API has no default kitchen — omitting this is a 409, not a fallback.
   */
  target_location_type?: ForwardTarget["target_location_type"];
  target_location_id?: string;
}

/**
 * Body for `POST /admin/requests/{id}/allocate` — Admin approving a
 * KITCHEN_TO_ADMIN dispatch request by splitting each line across branches.
 * `quantity` is per (line, branch); several entries may share a line_item_id.
 */
export interface DispatchAllocationInput {
  line_item_id: string;
  branch_id: string;
  quantity: number;
}

export interface AllocateDispatchInput {
  allocations: DispatchAllocationInput[];
  notes?: string;
}

/** 409 raised when an allocation's per-line total exceeds the ready quantity. */
export const ALLOCATION_EXCEEDS_READY = "allocation_exceeds_ready";

/** 409 raised when a forward carries no target kitchen. */
export const MISSING_KITCHEN_TARGET = "missing_kitchen_target";

/** 409 raised when a forward target is a warehouse or branch rather than a kitchen. */
export const INVALID_KITCHEN_TARGET = "invalid_kitchen_target";

/** 409 raised when a PO moves to RECEIVED or REPORTED without any line receipts. */
export const MISSING_LINE_RECEIPTS = "missing_line_receipts";

/** 409 raised when a received quantity exceeds the approved quantity. */
export const INVALID_RECEIVED_QUANTITY = "invalid_received_quantity";

/** 409 raised when a report says nothing is wrong — that is not a report. */
export const NOTHING_REPORTED = "nothing_reported";

// ---- Customers (Admin, read-only) ----

/**
 * A customer as the Admin portal reads it. Customers are tenant-scoped
 * (`restaurant_id`), so this is every customer across all of the restaurant's
 * branches — there is no `branch_id` here. Admin can only view them; creating,
 * editing, and deleting live in the Branch portal.
 */
export interface AdminCustomer {
  id: string;
  name: string;
  phone: string | null;
  created_at?: string;
}

export interface AdminCustomerFilters {
  page?: number;
  page_size?: number;
}
