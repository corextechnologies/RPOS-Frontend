import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackagePlus,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
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
      {
        label: "Receive stock",
        href: "/warehouse/stock/receive",
        icon: PackagePlus,
        action: "stock:receive",
        match: "exact",
      },
      {
        label: "Waste & expiry",
        href: "/warehouse/waste",
        icon: TriangleAlert,
        action: "stock:waste",
        match: "exact",
      },
    ],
  },
  {
    title: "Requests",
    items: [
      {
        label: "Purchase orders",
        href: "/warehouse/requests/po",
        icon: ClipboardList,
        action: "po:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Staff",
        href: "/warehouse/staff",
        icon: Users,
        action: "staff:read",
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
