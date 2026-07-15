import { Boxes, LayoutDashboard, Settings } from "lucide-react";
import type { NavSection } from "./types";

export const WAREHOUSE_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/warehouse/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    title: "Stock",
    items: [
      {
        label: "Inventory",
        href: "/warehouse/inventory",
        icon: Boxes,
        action: "inventory:read",
        match: "exact",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/warehouse/settings",
        icon: Settings,
        match: "exact",
      },
    ],
  },
];
