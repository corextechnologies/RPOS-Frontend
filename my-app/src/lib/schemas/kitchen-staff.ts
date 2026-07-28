import { z } from "zod";
import {
  jobTitleField,
  staffProfileDefaults,
  staffProfileFields,
} from "@/lib/schemas/staff";

/**
 * Kitchen staff creation — the shared seven fields plus a free-text `job_title`
 * ("Head Chef"). All eight are required; the server answers 422 for a partial
 * body. Editing stays partial and does not use this schema.
 */
export const createKitchenStaffSchema = z.object({
  ...staffProfileFields,
  // Shown as "Role" in the UI, sent as `job_title`. Free text: unlike a branch
  // position, nothing is derived from it.
  job_title: jobTitleField,
});

export type CreateKitchenStaffForm = z.infer<typeof createKitchenStaffSchema>;

export const createKitchenStaffDefaults: CreateKitchenStaffForm = {
  ...staffProfileDefaults,
  job_title: "",
};
