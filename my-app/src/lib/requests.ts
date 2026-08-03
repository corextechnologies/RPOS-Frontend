import type { Kitchen, StockRequest, Warehouse } from "@/lib/types/admin";

/**
 * The origin name to show in the "From" column/field.
 *
 * The backend fills `from_label` for branch and kitchen requests, but leaves it
 * empty on a WAREHOUSE_TO_ADMIN_PO — so for those we resolve the warehouse name
 * from `source_location_id` against the admin warehouse list. Returns undefined
 * when nothing can be resolved, letting callers fall back to a dash.
 */
export function resolveRequestFromLabel(
  req: Pick<StockRequest, "from_label" | "type" | "source_location_id">,
  warehouses?: Warehouse[],
): string | undefined {
  if (req.from_label) return req.from_label;
  if (req.type === "WAREHOUSE_TO_ADMIN_PO" && req.source_location_id) {
    return warehouses?.find((w) => w.id === req.source_location_id)?.name;
  }
  return undefined;
}

/**
 * The name of the kitchen the branch chose to fulfil a BRANCH_TO_ADMIN request,
 * resolved from `target_location_id` against the admin kitchen list. Returns
 * undefined when there is no kitchen target or it can't be resolved.
 */
export function resolveRequestToKitchenLabel(
  req: Pick<StockRequest, "target_location_type" | "target_location_id">,
  kitchens?: Kitchen[],
): string | undefined {
  if (req.target_location_type !== "KITCHEN" || !req.target_location_id) {
    return undefined;
  }
  // String-safe: ids may arrive as numbers from the live API while `Kitchen.id`
  // is a string.
  return kitchens?.find((k) => String(k.id) === String(req.target_location_id))?.name;
}
