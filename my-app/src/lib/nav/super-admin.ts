import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Plus, Settings, Receipt } from "lucide-react";
import type { AuthAction } from "@/lib/auth/actions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  action?: AuthAction;
  match?: "exact" | "prefix";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const SUPER_ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Restaurants",
        href: "/super-admin/dashboard",
        icon: LayoutDashboard,
        action: "restaurants:read",
        match: "exact",
      },
      {
        label: "Billing",
        href: "/super-admin/billing",
        icon: Receipt,
        action: "billing:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        label: "Add Restaurant",
        href: "/super-admin/restaurants/new",
        icon: Plus,
        action: "restaurants:create",
        match: "prefix",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/super-admin/settings",
        icon: Settings,
        match: "exact",
      },
    ],
  },
];

export function visibleNavItems(items: NavItem[], can: (action: AuthAction) => boolean) {
  return items.filter((item) => !item.action || can(item.action));
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
