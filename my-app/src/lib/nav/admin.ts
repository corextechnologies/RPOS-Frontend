import { Building2, CookingPot, LayoutDashboard, Receipt, Settings, Warehouse } from "lucide-react";
import type { NavSection } from "./types";

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
      {
        label: "Billing",
        href: "/admin/billing",
        icon: Receipt,
        action: "billing:read",
        match: "exact",
      },
    ],
  },
  {
    title: "Locations",
    items: [
      {
        label: "Branches",
        href: "/admin/branches",
        icon: Building2,
        action: "branches:read",
        match: "prefix",
      },
      {
        label: "Kitchens",
        href: "/admin/kitchens",
        icon: CookingPot,
        action: "kitchens:read",
        match: "prefix",
      },
      {
        label: "Warehouses",
        href: "/admin/warehouses",
        icon: Warehouse,
        action: "warehouses:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        match: "exact",
      },
    ],
  },
];
