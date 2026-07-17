export type PlanTier = "standard" | "premium" | "enterprise" | string;
export type PlanStatus = "active" | "halted";
export type AccessStatus = "active" | "revoked";
export type RestaurantStatus = "ACTIVE" | "HALTED";

/**
 * SUB_CHEF shares the Kitchen portal with KITCHEN_MANAGER rather than having one
 * of its own: the screens are identical, the manager-only actions are gated by
 * AuthAction. It is the first role that is not 1:1 with a portal.
 *
 * BRANCH_STAFF shares /branch with BRANCH_MANAGER on exactly that precedent.
 * Note the axis differs by surface: the branch portal gates on role, because
 * `/auth/me` returns role and nothing finer. The POS gates on the capability
 * list from `/pos/session/bootstrap`, which already folds in position and
 * device profile. Do not gate POS UI on role — see `@/lib/pos/capabilities`.
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "KITCHEN_MANAGER"
  | "SUB_CHEF"
  | "BRANCH_MANAGER"
  | "BRANCH_STAFF";

/**
 * The org label stored against a BRANCH_STAFF user. Read-only here: the server
 * resolves it into capabilities and the client consumes those instead, so this
 * exists to *explain* a permission ("your position cannot take cash"), never to
 * decide one.
 */
export type BranchPosition = "CASHIER" | "SALESPERSON" | "ORDER_TAKER";

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

/** Raw backend `InvoiceOut` DTO. */
export interface InvoiceOut {
  id: number;
  amount: string;
  issued_on: string;
  paid: boolean;
  restaurant_id: number;
  restaurant_name: string;
  owner_contact_email: string | null;
}

/** Normalized invoice used by UI components. */
export interface Invoice {
  id: string;
  amount: string;
  issued_on: string;
  paid: boolean;
  restaurant_id: string;
  restaurant_name: string;
  owner_contact_email: string | null;
}

/** Raw backend `BillingOut` DTO. */
export interface BillingOut {
  restaurant_id: number;
  restaurant_name: string;
  owner_contact_email: string | null;
  plan_tier: string | null;
  plan_amount: string | null;
  next_billing_date: string | null;
  invoices: InvoiceOut[];
}

export interface BillingSummary {
  restaurant_id: string;
  restaurant_name: string;
  owner_contact_email: string | null;
  plan_tier: PlanTier;
  plan_status?: PlanStatus;
  plan_amount: string | number | null;
  next_billing_date: string | null;
  invoices?: Invoice[];
}

export interface BillingCycleResult {
  generated: number;
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
  /**
   * Always send an explicit boolean. When true and a plan is set, backend seeds
   * paid (today) + unpaid (next month) invoices. Unchecked must be `false`, not omitted.
   */
  payment_received: boolean;
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
  /** When true, user must set a new password before accessing any portal. */
  must_change_password?: boolean;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export function displayName(user: MeResponse): string {
  return user.full_name?.trim() || user.email;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string,
    /**
     * The server's structured explanation. `parseApiError` already read this
     * off the envelope and dropped it, which made the POS's mandated
     * "409 with the server's breakdown" contract impossible to render — a
     * `price_mismatch` listing five lines is a dialog, not a toast.
     *
     * Shape varies by `code`; narrow with the `is*Details` guards in
     * `@/lib/api/errors` rather than casting at the call site.
     */
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const PLAN_AMOUNTS: Record<string, number> = {
  standard: 199,
  premium: 499,
  enterprise: 999,
};

export function formatPlanAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return n.toFixed(2);
}
