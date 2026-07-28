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
  // Shown as "Role" in the UI, sent as `job_title`. Free text.
  job_title: z
    .string()
    .max(100, "Role must be 100 characters or fewer")
    .optional(),
  phone_number: z
    .string()
    .max(30, "Phone number must be 30 characters or fewer")
    .optional(),
  // Absolute URL returned by the staff-image upload; the form only stores the
  // string, never the File.
  image_url: z
    .string()
    .max(1024, "Image URL must be 1024 characters or fewer")
    .optional(),
});

export type CreateKitchenStaffForm = z.infer<typeof createKitchenStaffSchema>;

export const createKitchenStaffDefaults: CreateKitchenStaffForm = {
  email: "",
  full_name: "",
  job_title: "",
  phone_number: "",
  image_url: "",
};
