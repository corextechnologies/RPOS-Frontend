import { z } from "zod";
import { applyPlanOnCreate } from "@/lib/plans/apply-plan";
import { DEFAULT_PLAN_TIER, PLAN_TIER_VALUES } from "@/lib/plans/catalog";

export const planTierSchema = z.enum(PLAN_TIER_VALUES);

export const createRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  owner_name: z.string().optional(),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z.string().optional(),
  plan_tier: planTierSchema,
  plan_amount: z.string().optional(),
  branch_limit: z.number().int().min(1),
  next_billing_date: z.string().optional(),
  has_central_kitchen: z.boolean(),
  payment_received: z.boolean(),
});

export const updateRestaurantSchema = z.object({
  plan_tier: planTierSchema,
  branch_limit: z.number().int("Must be a whole number").min(1, "Branch limit must be at least 1"),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z.string().optional(),
  plan_amount: z.string().optional(),
  next_billing_date: z.string().optional(),
  has_central_kitchen: z.boolean(),
});

export type CreateRestaurantForm = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantForm = z.infer<typeof updateRestaurantSchema>;

const initialPlan = applyPlanOnCreate(DEFAULT_PLAN_TIER);

export const createRestaurantDefaults: CreateRestaurantForm = {
  name: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  plan_tier: initialPlan.plan_tier as CreateRestaurantForm["plan_tier"],
  plan_amount: initialPlan.plan_amount,
  branch_limit: initialPlan.branch_limit,
  next_billing_date: initialPlan.next_billing_date,
  has_central_kitchen: true,
  payment_received: false,
};
