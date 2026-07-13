import { z } from "zod";

export const planTierSchema = z.enum(["starter", "growth", "enterprise"]);

export const createRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  owner_name: z.string().optional(),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z.string().optional(),
  branch_limit: z.number().int("Must be a whole number").min(1, "At least 1 branch required"),
  plan_tier: planTierSchema.optional(),
  plan_amount: z.union([z.string(), z.number()]).optional(),
  next_billing_date: z.string().optional(),
});

export const updateRestaurantSchema = z.object({
  plan_tier: planTierSchema.optional(),
  branch_limit: z.number().int("Must be a whole number").min(1, "Branch limit must be at least 1"),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z.string().optional(),
  plan_amount: z.union([z.string(), z.number()]).optional(),
  next_billing_date: z.string().optional(),
});

export type CreateRestaurantForm = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantForm = z.infer<typeof updateRestaurantSchema>;
