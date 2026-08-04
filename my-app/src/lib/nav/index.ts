import type { UserRole } from "@/lib/types/super-admin";
import type { AuthAction } from "@/lib/auth/actions";
import { ADMIN_NAV } from "./admin";
import { BRANCH_NAV } from "./branch";
import { KITCHEN_NAV } from "./kitchen";
import { SUPER_ADMIN_NAV } from "./super-admin";
import { WAREHOUSE_NAV } from "./warehouse";
import type { NavItem, NavSection, RestaurantFeature } from "./types";

export type { NavItem, NavSection, RestaurantFeature } from "./types";

const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  ADMIN: ADMIN_NAV,
  WAREHOUSE_MANAGER: WAREHOUSE_NAV,
  KITCHEN_MANAGER: KITCHEN_NAV,
  BRANCH_MANAGER: BRANCH_NAV,
  BRANCH_STAFF: BRANCH_NAV,
};

export function navForRole(role: UserRole): NavSection[] {
  return NAV_BY_ROLE[role] ?? [];
}

export function visibleNavItems(
  items: NavItem[],
  can: (action: AuthAction) => boolean,
  features?: Partial<Record<RestaurantFeature, boolean>>,
) {
  return items.filter((item) => {
    if (item.action && !can(item.action)) return false;
    // A feature is present unless explicitly false — an unknown flag never hides.
    if (item.requiresFeature && features?.[item.requiresFeature] === false) return false;
    return true;
  });
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
