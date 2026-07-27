import { z } from "zod";

/**
 * Profile-only edit of the admin's own restaurant. No plan/billing fields — the
 * admin cannot change commercial terms (those are Super-Admin-only). `logo_url`
 * is written in Phase 2; kept here so the schema is the single source of truth.
 */
export const adminRestaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
  owner_name: z.string().optional(),
  owner_email: z.string().email("Enter a valid email"),
  owner_phone: z.string().optional(),
  address: z.string().max(500, "Address is too long").optional(),
  logo_url: z
    .string()
    .max(1024, "URL is too long")
    .refine(
      (value) => value === "" || z.string().url().safeParse(value).success,
      "Enter a valid image URL",
    )
    .optional(),
});

export type AdminRestaurantForm = z.infer<typeof adminRestaurantSchema>;

export const adminRestaurantDefaults: AdminRestaurantForm = {
  name: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  address: "",
  logo_url: "",
};
