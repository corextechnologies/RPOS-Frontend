import type { UserRole } from "@/lib/types/super-admin";

export const PORTAL_HOME: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  WAREHOUSE_MANAGER: "/warehouse/dashboard",
  KITCHEN_MANAGER: "/kitchen/dashboard",
  SUB_CHEF: "/kitchen/dashboard",
  BRANCH_MANAGER: "/branch/dashboard",
  BRANCH_STAFF: "/branch/dashboard",
};

export const PORTAL_PREFIX: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  WAREHOUSE_MANAGER: "/warehouse",
  KITCHEN_MANAGER: "/kitchen",
  SUB_CHEF: "/kitchen",
  BRANCH_MANAGER: "/branch",
  BRANCH_STAFF: "/branch",
};

export const PORTAL_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  WAREHOUSE_MANAGER: "Warehouse",
  KITCHEN_MANAGER: "Kitchen",
  SUB_CHEF: "Kitchen",
  BRANCH_MANAGER: "Branch",
  BRANCH_STAFF: "Branch",
};

/** Every role the Branch portal admits, in the shape ProtectedPortalLayout wants. */
export const BRANCH_PORTAL_ROLES = ["BRANCH_MANAGER", "BRANCH_STAFF"] as const;

export function portalPathForRole(role: UserRole): string {
  return PORTAL_HOME[role] ?? "/login";
}

/**
 * Note that KITCHEN_MANAGER/SUB_CHEF share `/kitchen` and BRANCH_MANAGER/
 * BRANCH_STAFF share `/branch`, so this resolves those paths to the manager of
 * each pair — whichever key `PORTAL_PREFIX` lists first. Callers wanting the
 * signed-in user's actual role should read it from the user, not infer it from
 * the URL.
 */
export function roleForPortalPath(pathname: string): UserRole | null {
  const entry = (Object.entries(PORTAL_PREFIX) as [UserRole, string][]).find(
    ([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return entry?.[0] ?? null;
}

/**
 * A portal admits one role or several. The Kitchen portal is the only one with
 * several today — KITCHEN_MANAGER and SUB_CHEF see the same screens, and which
 * actions are offered is decided per-action by `canPerform`, not here.
 */
export function isRoleAllowed(
  role: UserRole | undefined,
  required: UserRole | readonly UserRole[],
): boolean {
  if (!role) return false;
  return Array.isArray(required) ? required.includes(role) : role === required;
}
