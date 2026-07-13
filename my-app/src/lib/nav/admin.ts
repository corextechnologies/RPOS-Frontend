import { LayoutDashboard, Receipt, Settings } from "lucide-react";
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
