// Admin (Phase 2) DTOs — mirrors the /v1/admin/* backend contract.
// Kept separate from super-admin.ts. Do NOT modify Super Admin types.

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
  created_at?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

// ---- Pricing ----
export interface ProductPricing {
  id: string; // product_id
  name: string;
  sku?: string | null;
  cost_price: string | null; // decimal string, like billing amounts
}

export interface UpdateProductPricingInput {
  cost_price: number | string; // >= 0
}

// ---- Requests ----
export type AdminRequestType = "BRANCH_TO_ADMIN" | "WAREHOUSE_TO_ADMIN_PO";

/**
 * The full branch-request vocabulary. PRODUCED and ALLOCATED are driven by the
 * Kitchen portal (Phase 4) and never appear in Admin's transition map, but a
 * forwarded request comes back through Admin's read screens carrying them, so
 * they must parse here.
 */
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_APPROVED"
  | "FORWARDED_TO_KITCHEN"
  | "IN_QUEUE"
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
}

export interface StockRequest {
  id: string;
  type: AdminRequestType;
  status: RequestStatus;
  notes?: string | null;
  from_label?: string; // branch/warehouse name for UI
  line_items: RequestLineItem[];
  created_at: string;
  updated_at?: string;
}

export interface RequestFilters {
  status?: RequestStatus | "all";
  page?: number;
  page_size?: number;
}

export interface LineApproval {
  line_id: string;
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

/** 409 raised when a forward carries no target kitchen. */
export const MISSING_KITCHEN_TARGET = "missing_kitchen_target";

/** 409 raised when a forward target is a warehouse or branch rather than a kitchen. */
export const INVALID_KITCHEN_TARGET = "invalid_kitchen_target";
