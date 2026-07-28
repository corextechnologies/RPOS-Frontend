import { z } from "zod";

/**
 * The seven portal-agnostic staff fields, all REQUIRED on create.
 *
 * Every portal now collects the same set — the server answers 422 for a partial
 * body — so the rules live here once instead of being retyped four times. Each
 * portal extends this with its own field 6 (position / job_title / role), which
 * is the only field whose type differs between portals.
 *
 * Note this is the CREATE shape. Edit stays partial (PATCH treats an omitted
 * field as "unchanged"), so the edit forms reuse the field components but
 * diff against the loaded record rather than validating with this schema.
 */
export const staffProfileFields = {
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name must be 255 characters or fewer"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email")
    .max(255, "Email must be 255 characters or fewer"),
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .max(30, "Phone number must be 30 characters or fewer"),
  address: z
    .string()
    .min(1, "Address is required")
    .max(500, "Address must be 500 characters or fewer"),
  // The three uploads. Each holds the signed URL the upload endpoint returned —
  // the form never carries the File itself. Required, so the message names the
  // missing image rather than showing a bare "Required".
  image_url: z.string().min(1, "Upload a profile photo"),
  cnic_front_url: z.string().min(1, "Upload the front of the CNIC"),
  cnic_back_url: z.string().min(1, "Upload the back of the CNIC"),
} as const;

/** Blank values for the shared fields — spread into each portal's defaults. */
export const staffProfileDefaults = {
  full_name: "",
  email: "",
  phone_number: "",
  address: "",
  image_url: "",
  cnic_front_url: "",
  cnic_back_url: "",
} as const;

/** Free-text job title (Kitchen and Warehouse). Required, like every field. */
export const jobTitleField = z
  .string()
  .min(1, "Role is required")
  .max(100, "Role must be 100 characters or fewer");
