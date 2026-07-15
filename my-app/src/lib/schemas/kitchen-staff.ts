import { z } from "zod";

export const createKitchenStaffSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .max(255, "Email must be 255 characters or fewer"),
  full_name: z
    .string()
    .max(255, "Name must be 255 characters or fewer")
    .optional(),
});

export type CreateKitchenStaffForm = z.infer<typeof createKitchenStaffSchema>;

export const createKitchenStaffDefaults: CreateKitchenStaffForm = {
  email: "",
  full_name: "",
};
