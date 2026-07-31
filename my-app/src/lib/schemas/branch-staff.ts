import { z } from "zod";
import { staffProfileDefaults, staffProfileFields } from "@/lib/schemas/staff";
import type { BranchPosition } from "@/lib/types/super-admin";

/**
 * The branch positions. A FIXED list, never free text: the server resolves
 * `position` into the capability list it gates on, so a typed value would grant
 * the person nothing. Kitchen and warehouse use free-text `job_title` precisely
 * because nothing is derived from those.
 *
 * The first three are till profiles; CHEF is the odd one out — a sub-kitchen
 * prep role that never touches a till (no orders, no cash, no device pairing).
 */
export const branchPositions = [
  "CASHIER",
  "SALESPERSON",
  "ORDER_TAKER",
  "CHEF",
] as const satisfies readonly BranchPosition[];

/**
 * Branch staff creation — the shared seven fields plus a `position` dropdown.
 * All eight are required; the server answers 422 for a partial body. Editing
 * stays partial and does not use this schema.
 */
export const createBranchStaffSchema = z.object({
  ...staffProfileFields,
  position: z.enum(branchPositions),
});

export type CreateBranchStaffForm = z.infer<typeof createBranchStaffSchema>;

export const createBranchStaffDefaults: CreateBranchStaffForm = {
  ...staffProfileDefaults,
  position: "CASHIER",
};
