import { LayoutDashboard, Settings } from "lucide-react";
import type { NavSection } from "./types";

export const BRANCH_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/branch/dashboard",
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
        href: "/branch/settings",
        icon: Settings,
        match: "exact",
      },
    ],
  },
];
