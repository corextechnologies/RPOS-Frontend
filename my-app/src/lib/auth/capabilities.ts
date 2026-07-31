import type { Capability } from "@/lib/types/pos";
import type { MeResponse } from "@/lib/types/super-admin";

/**
 * The hybrid Branch-access model.
 *
 * `position` decides *where* a branch user lands (routing + which area/tabs
 * exist); `capabilities` decide *which actions* they may take inside the Branch
 * area. Capabilities are a Branch-only concept — Admin/Kitchen/Warehouse return
 * `[]`, meaning "not applicable", so this logic must never gate those portals.
 * Mirror the server: role/position on the route, capability per action.
 */

/** A branch CHEF: role BRANCH_STAFF with the CHEF sub-position. */
export function isBranchChef(user: MeResponse | null | undefined): boolean {
  return user?.role === "BRANCH_STAFF" && user?.position === "CHEF";
}

/** Whether the signed-in user holds a given branch capability. */
export function userHasCapability(
  user: MeResponse | null | undefined,
  cap: Capability,
): boolean {
  return (user?.capabilities ?? []).includes(cap);
}
