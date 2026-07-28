import type { UserRole } from "@/lib/types/super-admin";

export const PORTAL_HOME: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  WAREHOUSE_MANAGER: "/warehouse/dashboard",
  WAREHOUSE_STAFF: "/warehouse/dashboard",
  KITCHEN_MANAGER: "/kitchen/dashboard",
  BRANCH_MANAGER: "/branch/dashboard",
  BRANCH_STAFF: "/pos",
};

export const PORTAL_PREFIX: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  WAREHOUSE_MANAGER: "/warehouse",
  WAREHOUSE_STAFF: "/warehouse",
  KITCHEN_MANAGER: "/kitchen",
  BRANCH_MANAGER: "/branch",
  BRANCH_STAFF: "/pos",
};

export const PORTAL_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  WAREHOUSE_MANAGER: "Warehouse",
  WAREHOUSE_STAFF: "Warehouse",
  KITCHEN_MANAGER: "Kitchen",
  BRANCH_MANAGER: "Branch",
  BRANCH_STAFF: "POS",
};

/** The Branch portal is for managers; staff sell through `/pos`. */
export const BRANCH_PORTAL_ROLES = ["BRANCH_MANAGER"] as const;

/**
 * Warehouse managers and warehouse staff share `/warehouse`. Staff provisioning
 * is gated by AuthAction (`staff:read` / `staff:create`), not by this list.
 */
export const WAREHOUSE_PORTAL_ROLES = ["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"] as const;

export function isWarehousePortalRole(role: UserRole | undefined): boolean {
  return role === "WAREHOUSE_MANAGER" || role === "WAREHOUSE_STAFF";
}

export function portalPathForRole(role: UserRole): string {
  return PORTAL_HOME[role] ?? "/login";
}

/**
 * Note that WAREHOUSE_MANAGER/WAREHOUSE_STAFF share `/warehouse`, so this
 * resolves that path to whichever key `PORTAL_PREFIX` lists first. Callers
 * wanting the signed-in user's actual role should read it from the user, not
 * infer it from the URL.
 */
export function roleForPortalPath(pathname: string): UserRole | null {
  const entry = (Object.entries(PORTAL_PREFIX) as [UserRole, string][]).find(
    ([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return entry?.[0] ?? null;
}

/**
 * A portal admits one role or several. Warehouse (manager + staff) shares
 * screens; which actions are offered is decided per-action by `canPerform`,
 * not here.
 */
export function isRoleAllowed(
  role: UserRole | undefined,
  required: UserRole | readonly UserRole[],
): boolean {
  if (!role) return false;
  return Array.isArray(required) ? required.includes(role) : role === required;
}
