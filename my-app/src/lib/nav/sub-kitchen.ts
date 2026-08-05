import {
  ClipboardList,
  LineChart,
  Package,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { NavSection } from "./types";

/**
 * The Sub-kitchen portal's nav.
 *
 * Not filtered by `action`: this nav is only ever rendered for someone the shell
 * has already admitted to the station (a CHEF or the branch manager), and the
 * chef's role — BRANCH_STAFF — carries none of the branch actions, so filtering
 * would empty it. What a given person may *do* is decided per-button by
 * capability, which is the layer that actually mirrors the server.
 */
export const SUB_KITCHEN_NAV: NavSection[] = [
  {
    title: "Prep",
    items: [
      { label: "Overview", href: "/sub-kitchen/overview", icon: LineChart, match: "exact" },
      { label: "Board", href: "/sub-kitchen", icon: ClipboardList, match: "exact" },
      { label: "Stock", href: "/sub-kitchen/stock", icon: Package, match: "exact" },
      {
        label: "Propose dish",
        href: "/sub-kitchen/menu-proposals",
        icon: UtensilsCrossed,
        match: "prefix",
      },
      { label: "Waste", href: "/sub-kitchen/waste", icon: Trash2, match: "exact" },
    ],
  },
];
