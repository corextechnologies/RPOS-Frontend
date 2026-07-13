export type PlanTier = "starter" | "growth" | "enterprise";
export type PlanStatus = "active" | "halted";
export type AccessStatus = "active" | "revoked";
export type InvoiceStatus = "paid" | "pending" | "overdue";
export type UserRole = "super_admin" | "restaurant_admin";

export interface RestaurantAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  access_status: AccessStatus;
}

export interface Restaurant {
  id: string;
  name: string;
  plan_tier: PlanTier;
  plan_status: PlanStatus;
  branch_limit: number;
  branch_count: number;
  admin: RestaurantAdmin;
  created_at: string;
  updated_at: string;
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
  plan_status: PlanStatus;
  plan_amount: number;
  next_billing_date: string;
}

export interface CreateRestaurantInput {
  name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  branch_count: number;
  plan_tier: PlanTier;
}

export interface UpdateRestaurantInput {
  name?: string;
  plan_tier?: PlanTier;
  branch_limit?: number;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
}

export interface CreateRestaurantResult {
  restaurant: Restaurant;
  credentials: {
    email: string;
    temporary_password: string;
    emailed: boolean;
  };
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const PLAN_AMOUNTS: Record<PlanTier, number> = {
  starter: 49,
  growth: 149,
  enterprise: 399,
};
