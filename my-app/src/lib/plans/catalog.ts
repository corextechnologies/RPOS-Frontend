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
 * First billing eligibility: `next_billing_date` = today.
 * Backend generates an invoice when `next_billing_date <= today`, then advances +1 month.
 */
export function defaultNextBillingDate(from: Date = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  const d = String(from.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
