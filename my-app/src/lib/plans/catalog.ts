export const PLAN_TIER_VALUES = ["standard", "premium", "enterprise"] as const;
export type PlanTierValue = (typeof PLAN_TIER_VALUES)[number];

export interface PlanOption {
  tier: PlanTierValue;
  label: string;
  amount: string;
  branchLimit: number;
}

export const DEFAULT_PLAN_TIER: PlanTierValue = "standard";

/**
 * Frontend-defined plan catalog — no backend plans API yet.
 * Amounts are decimal strings sent as `plan_amount` on create/update.
 */
export const PLAN_CATALOG: PlanOption[] = [
  { tier: "standard", label: "Standard", amount: "199.00", branchLimit: 3 },
  { tier: "premium", label: "Premium", amount: "499.00", branchLimit: 10 },
  { tier: "enterprise", label: "Enterprise", amount: "999.00", branchLimit: 50 },
];

/**
 * First `next_billing_date` on create: today + 1 calendar month.
 * Matches backend default so create preview is not overridden by sending "today".
 * Backend generates an invoice when `next_billing_date <= today`, then advances +1 month again.
 */
export function defaultNextBillingDate(from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = date.getDate();
  date.setMonth(date.getMonth() + 1);
  // Clamp month-end overflow (e.g. Jan 31 → last day of February)
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return formatISODate(date);
}

/** Today's date as YYYY-MM-DD (local calendar). Used to mark a restaurant bill as due. */
export function todayBillingDate(from: Date = new Date()): string {
  return formatISODate(new Date(from.getFullYear(), from.getMonth(), from.getDate()));
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Advance a YYYY-MM-DD date by one calendar month (backend-style). */
export function addOneBillingMonth(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDate();
  date.setMonth(date.getMonth() + 1);
  if (date.getDate() !== day) {
    date.setDate(0);
  }
  return formatISODate(date);
}

export function planByTier(tier: string | null | undefined): PlanOption | undefined {
  if (!tier) return undefined;
  return PLAN_CATALOG.find((p) => p.tier === tier);
}

export function planAmountForTier(tier: string | null | undefined): string | undefined {
  return planByTier(tier)?.amount;
}

export function isKnownPlanTier(tier: string): tier is PlanTierValue {
  return PLAN_TIER_VALUES.includes(tier as PlanTierValue);
}
