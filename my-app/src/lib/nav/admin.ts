import {
  Building2,
  CookingPot,
  DollarSign,
  Inbox,
  LayoutDashboard,
  Receipt,
  Settings,
  Tag,
  Users,
  Warehouse,
} from "lucide-react";
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
    title: "People",
    items: [
      {
        label: "Employees",
        href: "/admin/employees",
        icon: Users,
        action: "employees:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Pricing",
        href: "/admin/pricing",
        icon: Tag,
        action: "pricing:read",
        match: "exact",
      },
      {
        label: "Requests",
        href: "/admin/requests",
        icon: Inbox,
        action: "requests:read",
        match: "prefix",
      },
      {
        label: "Sales",
        href: "/admin/sales",
        icon: DollarSign,
        action: "sales:read",
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
