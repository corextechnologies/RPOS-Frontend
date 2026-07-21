import type { UserRole } from "@/lib/types/super-admin";
import type { AppNotification } from "@/lib/types/notification";

/**
 * Where a notification deep-links to, or null when it links nowhere.
 *
 * Returning null is a first-class answer, not a failure: an unrecognised
 * `entity_type` must render as a plain, inert row rather than crash the inbox or
 * navigate somewhere wrong. New types arrive without an API version bump, so
 * "unknown" is the expected steady state, not an edge case.
 *
 * The destination also depends on who is reading — a "request" means a different
 * screen to a warehouse manager than to a kitchen manager, since each portal
 * only serves its own scope.
 */
export function notificationLink(
  notification: AppNotification,
  role: UserRole | undefined,
): string | null {
  const id = notification.entity_id;
  if (!id || !role) return null;

  switch (notification.entity_type) {
    case "request":
      return requestLink(id, role);
    case "stock_count":
      // Only the kitchen has counts, and only its manager may read them.
      return role === "KITCHEN_MANAGER" ? "/kitchen/counts" : null;
    case "product":
      // The low-stock alert. There is no per-product stock page, so this lands
      // on the stock list that the limit is measured against — the warehouse's
      // own inventory. Point it at a product page if one is ever built.
      return role === "WAREHOUSE_MANAGER" ? "/warehouse/inventory" : null;
    case "production_target":
      // Admin is told when a kitchen acknowledges or completes; the kitchen
      // manager is told when Admin creates one. Each lands on its own detail
      // screen for the same target id.
      return productionTargetLink(id, role);
    default:
      // A type this build has never heard of. Inert, not broken.
      return null;
  }
}

function productionTargetLink(id: string, role: UserRole): string | null {
  switch (role) {
    case "ADMIN":
      return `/admin/production-targets/${id}`;
    case "KITCHEN_MANAGER":
      return `/kitchen/production-targets/${id}`;
    default:
      return null;
  }
}

function requestLink(id: string, role: UserRole): string | null {
  switch (role) {
    case "ADMIN":
      return `/admin/requests/${id}`;
    case "WAREHOUSE_MANAGER":
      return `/warehouse/requests/${id}`;
    case "KITCHEN_MANAGER":
    case "SUB_CHEF":
      return `/kitchen/requests/${id}`;
    default:
      return null;
  }
}
