import { LayoutDashboard, Plus, Settings, Receipt, TrendingUp } from "lucide-react";
import type { NavSection } from "./types";

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
        label: "Income",
        href: "/super-admin/income",
        icon: TrendingUp,
        match: "prefix",
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
