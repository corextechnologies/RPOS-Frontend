import { LayoutDashboard, Settings } from "lucide-react";
import type { NavSection } from "./types";

export const KITCHEN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/kitchen/dashboard",
        icon: LayoutDashboard,
        match: "exact",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "Settings",
        href: "/kitchen/settings",
        icon: Settings,
        match: "exact",
      },
    ],
  },
];
