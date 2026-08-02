import type { Capability } from "@/lib/types/pos";

export type PlanTier = "standard" | "premium" | "enterprise" | string;
export type PlanStatus = "active" | "halted";
export type AccessStatus = "active" | "revoked";
export type RestaurantStatus = "ACTIVE" | "HALTED";

/**
 * The Warehouse and Kitchen portals are both manager-only: their staff are
 * personnel records on a roster (see `WarehouseStaff` / `KitchenStaff`), not
 * user accounts — they cannot sign in, so neither has a staff role here. Admin
 * creates the managers; each manager keeps their location's roster.
 *
 * BRANCH_STAFF lands in `/pos` rather than the Branch Manager portal. The POS
 * gates on the capability list from `/pos/session/bootstrap`, which already
 * folds in position and device profile. Do not gate POS UI on role — see
 * `@/lib/pos/capabilities`.
 */
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "WAREHOUSE_MANAGER"
  | "KITCHEN_MANAGER"
  | "BRANCH_MANAGER"
  | "BRANCH_STAFF";

/**
 * The org label stored against a BRANCH_STAFF user. Read-only here: the server
 * resolves it into capabilities and the client consumes those instead, so this
 * exists to *explain* a permission ("your position cannot take cash"), never to
 * decide one.
 */
export type BranchPosition = "CASHIER" | "SALESPERSON" | "ORDER_TAKER" | "CHEF";

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
  /**
   * Whether this tenant runs a central/cloud kitchen. When false, kitchen
   * responsibilities collapse onto each branch's sub-kitchen. Set by Super Admin.
   * The adapter defaults a missing value to `true`, so a backend that does not
   * yet send the field behaves exactly as before.
   */
  has_central_kitchen: boolean;
  plan_amount?: string | null;
  next_billing_date?: string | null;
  admin: RestaurantAdmin;
  /** Street/mailing address. Optional — older payloads omit it. */
  address?: string | null;
  /** Absolute or server-relative URL to the restaurant logo (Phase 2). */
  logo_url?: string | null;
  /** Stable public identifier for the QR live-menu URL, e.g. `demo-bistro`. */
  public_slug?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Raw backend `RestaurantOut` DTO. */
export interface RestaurantOut {
  id: number;
  name: string;
  admin_full_name: string | null;
  owner_contact_number: string | null;
  owner_contact_email: string | null;
  status: RestaurantStatus;
  plan_tier: string | null;
  plan_amount: string | null;
  branch_limit: number | null;
  next_billing_date: string | null;
  address?: string | null;
  logo_url?: string | null;
  public_slug?: string | null;
  /** Optional until the backend adds it; the adapter treats a missing value as `true`. */
  has_central_kitchen?: boolean | null;
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
  /** Whether the new tenant runs a central/cloud kitchen. Defaults to true. */
  has_central_kitchen?: boolean;
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
  /** Toggle the central/cloud kitchen on or off. Omitted when unchanged. */
  has_central_kitchen?: boolean;
}

/**
 * Profile-only patch an ADMIN may apply to their OWN restaurant. Deliberately
 * excludes the commercial levers (`plan_tier`, `plan_amount`, `branch_limit`,
 * `next_billing_date`) — those stay Super-Admin-only so an admin cannot change
 * their own billing terms. Plan changes go through the upgrade-request flow.
 */
export interface UpdateAdminRestaurantInput {
  name?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  address?: string;
  logo_url?: string;
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
  /**
   * Branch sub-role. Present for BRANCH_STAFF; drives portal routing (a `CHEF`
   * lands in the sub-kitchen, not the till). Absent/null for other roles.
   */
  position?: BranchPosition | null;
  /** The location the user belongs to. Only one is set, per role. */
  branch_id?: number | null;
  kitchen_id?: number | null;
  warehouse_id?: number | null;
  /**
   * Branch-only permission list (empty `[]` for Admin/Kitchen/Warehouse, meaning
   * "not applicable"). Gate individual Branch-area actions on this — never gate
   * other portals on it, and never infer it from `role`. See {@link Capability}.
   */
  capabilities?: Capability[];
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
  if (amount === null || amount === undefined || amount === "") return "-";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return n.toFixed(2);
}
