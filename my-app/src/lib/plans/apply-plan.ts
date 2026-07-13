import {
  defaultNextBillingDate,
  planByTier,
  type PlanTierValue,
} from "@/lib/plans/catalog";

export interface PlanFormFields {
  plan_tier: string;
  plan_amount: string;
  branch_limit: number;
  next_billing_date?: string;
}

/** Apply catalog values when a plan tier is selected on create. */
export function applyPlanOnCreate(tier: string): PlanFormFields {
  const plan = planByTier(tier);
  return {
    plan_tier: tier,
    plan_amount: plan?.amount ?? "",
    branch_limit: plan?.branchLimit ?? 1,
    next_billing_date: defaultNextBillingDate(),
  };
}

/** On edit, update amount and branch limit from catalog; keep existing billing date. */
export function applyPlanOnEdit(
  tier: string,
  existingNextBillingDate?: string | null,
): Omit<PlanFormFields, "next_billing_date"> & { next_billing_date?: string } {
  const plan = planByTier(tier);
  return {
    plan_tier: tier,
    plan_amount: plan?.amount ?? "",
    branch_limit: plan?.branchLimit ?? 1,
    ...(existingNextBillingDate ? { next_billing_date: existingNextBillingDate } : {}),
  };
}

export function resolvePlanTier(tier: string | null | undefined): PlanTierValue {
  const plan = planByTier(tier);
  return plan?.tier ?? "standard";
}
