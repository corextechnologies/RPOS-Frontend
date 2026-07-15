import { z } from "zod";

export const createWarehouseStaffSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must be 255 characters or fewer")
    .email("Enter a valid email address"),
  full_name: z
    .string()
    .max(255, "Name must be 255 characters or fewer")
    .optional(),
});

export type CreateWarehouseStaffForm = z.infer<typeof createWarehouseStaffSchema>;

export const createWarehouseStaffDefaults: CreateWarehouseStaffForm = {
  email: "",
  full_name: "",
};
