import type { UserRole } from "@/lib/types/super-admin";

export const PORTAL_HOME: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  ADMIN: "/admin/dashboard",
  WAREHOUSE_MANAGER: "/warehouse/dashboard",
  KITCHEN_MANAGER: "/kitchen/dashboard",
  BRANCH_MANAGER: "/branch/dashboard",
};

export const PORTAL_PREFIX: Record<UserRole, string> = {
  SUPER_ADMIN: "/super-admin",
  ADMIN: "/admin",
  WAREHOUSE_MANAGER: "/warehouse",
  KITCHEN_MANAGER: "/kitchen",
  BRANCH_MANAGER: "/branch",
};

export const PORTAL_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  WAREHOUSE_MANAGER: "Warehouse",
  KITCHEN_MANAGER: "Kitchen",
  BRANCH_MANAGER: "Branch",
};

export function portalPathForRole(role: UserRole): string {
  return PORTAL_HOME[role] ?? "/login";
}

export function roleForPortalPath(pathname: string): UserRole | null {
  const entry = (Object.entries(PORTAL_PREFIX) as [UserRole, string][]).find(
    ([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return entry?.[0] ?? null;
}

export function isRoleAllowed(role: UserRole | undefined, required: UserRole): boolean {
  return role === required;
}
