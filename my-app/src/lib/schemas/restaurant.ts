import { z } from "zod";

export const planTierSchema = z.enum(["starter", "growth", "enterprise"]);

export const createRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  owner_name: z.string().min(2, "Owner name is required"),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[+\d\s()-]+$/, "Enter a valid phone number"),
  branch_count: z.number().int("Must be a whole number").min(1, "At least 1 branch required"),
  plan_tier: planTierSchema,
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  plan_tier: planTierSchema,
  branch_limit: z.number().int("Must be a whole number").min(1, "Branch limit must be at least 1"),
  owner_name: z.string().min(2, "Owner name is required"),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .regex(/^[+\d\s()-]+$/, "Enter a valid phone number"),
});

export type CreateRestaurantForm = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantForm = z.infer<typeof updateRestaurantSchema>;
