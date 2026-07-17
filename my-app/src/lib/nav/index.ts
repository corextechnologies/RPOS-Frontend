import type { UserRole } from "@/lib/types/super-admin";
import type { AuthAction } from "@/lib/auth/actions";
import { ADMIN_NAV } from "./admin";
import { BRANCH_NAV } from "./branch";
import { KITCHEN_NAV } from "./kitchen";
import { SUPER_ADMIN_NAV } from "./super-admin";
import { WAREHOUSE_NAV } from "./warehouse";
import type { NavItem, NavSection } from "./types";

export type { NavItem, NavSection } from "./types";

const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  SUPER_ADMIN: SUPER_ADMIN_NAV,
  ADMIN: ADMIN_NAV,
  WAREHOUSE_MANAGER: WAREHOUSE_NAV,
  KITCHEN_MANAGER: KITCHEN_NAV,
  // Same nav as the manager; `visibleNavItems` narrows it by action.
  SUB_CHEF: KITCHEN_NAV,
  BRANCH_MANAGER: BRANCH_NAV,
  BRANCH_STAFF: BRANCH_NAV,
};

export function navForRole(role: UserRole): NavSection[] {
  return NAV_BY_ROLE[role] ?? [];
}

export function visibleNavItems(items: NavItem[], can: (action: AuthAction) => boolean) {
  return items.filter((item) => !item.action || can(item.action));
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
