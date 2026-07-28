import { z } from "zod";
import {
  jobTitleField,
  staffProfileDefaults,
  staffProfileFields,
} from "@/lib/schemas/staff";

/**
 * Warehouse staff creation — the shared seven fields plus a free-text
 * `job_title` ("Loader"). All eight are required; the server answers 422 for a
 * partial body. Editing stays partial and does not use this schema.
 */
export const createWarehouseStaffSchema = z.object({
  ...staffProfileFields,
  // Shown as "Role" in the UI, sent as `job_title`. Free text — unlike a branch
  // position, nothing is derived from it.
  job_title: jobTitleField,
});

export type CreateWarehouseStaffForm = z.infer<typeof createWarehouseStaffSchema>;

export const createWarehouseStaffDefaults: CreateWarehouseStaffForm = {
  ...staffProfileDefaults,
  job_title: "",
};
