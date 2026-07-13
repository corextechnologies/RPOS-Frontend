export type PlanTier = "starter" | "growth" | "enterprise" | string;
export type PlanStatus = "active" | "halted";
export type AccessStatus = "active" | "revoked";
export type InvoiceStatus = "paid" | "pending" | "overdue";
export type RestaurantStatus = "ACTIVE" | "HALTED";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "KITCHEN_MANAGER"
  | "BRANCH_MANAGER";

export interface RestaurantAdmin {
  id?: string;
  name: string;
  email: string;
  phone: string;
  access_status: AccessStatus;
}

/** Normalized restaurant shape used by UI components. */
export interface Restaurant {
  id: string;
  name: string;
  plan_tier: PlanTier;
  plan_status: PlanStatus;
  branch_limit: number;
  branch_count: number;
  plan_amount?: string | null;
  next_billing_date?: string | null;
  admin: RestaurantAdmin;
  created_at?: string;
  updated_at?: string;
}

/** Raw backend `RestaurantOut` DTO. */
export interface RestaurantOut {
  id: number;
  name: string;
  owner_contact_number: string | null;
  owner_contact_email: string | null;
  status: RestaurantStatus;
  plan_tier: string | null;
  plan_amount: string | null;
  branch_limit: number | null;
  next_billing_date: string | null;
}

export interface RestaurantCreateResult {
  restaurant: RestaurantOut;
  admin_user_id: number;
  admin_email: string;
  credential_email_sent: boolean;
}

export interface RestaurantFilters {
  search?: string;
  plan_status?: PlanStatus | "all";
  access_status?: AccessStatus | "all";
}

export interface RestaurantStats {
  total: number;
  active_plans: number;
  halted: number;
  revoked: number;
  by_plan_status: { active: number; halted: number };
}

export interface Invoice {
  id: string;
  restaurant_id: string;
  amount: number;
  billing_date: string;
  period: string;
  shared_with_admin: boolean;
  status: InvoiceStatus;
}

export interface BillingSummary {
  restaurant_id: string;
  plan_tier: PlanTier;
  plan_status?: PlanStatus;
  plan_amount: string | number | null;
  next_billing_date: string | null;
  invoices?: Invoice[];
}

export interface CreateRestaurantInput {
  name: string;
  owner_name?: string;
  owner_email: string;
  owner_phone?: string;
  branch_limit?: number;
  plan_tier?: string;
  plan_amount?: string | number;
  next_billing_date?: string;
}

export interface UpdateRestaurantInput {
  name?: string;
  plan_tier?: string;
  plan_amount?: string | number;
  branch_limit?: number;
  next_billing_date?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
}

export interface CreateRestaurantResult {
  restaurant: Restaurant;
  admin_email: string;
  admin_user_id?: number;
  credential_email_sent: boolean;
  /** Present in mock mode only. */
  temporary_password?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  restaurant_id: number | null;
  created_by_id: number | null;
  is_active: boolean;
}

export function displayName(user: MeResponse): string {
  return user.full_name?.trim() || user.email;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const PLAN_AMOUNTS: Record<string, number> = {
  starter: 49,
  growth: 149,
  enterprise: 399,
};

export function formatPlanAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return n.toFixed(2);
}
