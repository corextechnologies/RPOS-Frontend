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

export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_APPROVED"
  | "FORWARDED_TO_KITCHEN"
  | "IN_QUEUE"
  | "IN_PRODUCTION"
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

export interface UpdateRequestStatusInput {
  to_status: RequestStatus;
  line_approvals?: LineApproval[];
  notes?: string;
  assignee_id?: string;
}
