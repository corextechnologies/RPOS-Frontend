import {
  Ban,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  MonitorSmartphone,
  Package,
  PackageCheck,
  Receipt,
  Settings,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import type { NavSection } from "./types";

/**
 * One nav for both BRANCH_MANAGER and BRANCH_STAFF — `visibleNavItems` narrows
 * it by action. A staff member
 * simply never sees Waste, Sub-kitchen, Requests or Planning.
 */
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
    title: "Selling",
    items: [
      {
        label: "Orders",
        href: "/branch/orders",
        icon: Receipt,
        action: "branch-orders:read",
        match: "prefix",
      },
      {
        label: "Availability",
        href: "/branch/availability",
        icon: Ban,
        action: "branch-waste:log",
        match: "exact",
      },
      {
        label: "Customers",
        href: "/branch/customers",
        icon: Users,
        action: "branch-customers:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Staff",
        href: "/branch/staff",
        icon: UserRound,
        action: "branch-staff:read",
        match: "exact",
      },
      {
        label: "Terminals",
        href: "/branch/devices",
        icon: MonitorSmartphone,
        action: "devices:read",
        match: "exact",
      },
    ],
  },
  {
    title: "Stock",
    items: [
      {
        label: "Inventory",
        href: "/branch/inventory",
        icon: Package,
        action: "branch-inventory:read",
        match: "exact",
      },
      {
        label: "Sub-kitchen",
        href: "/branch/sub-kitchen",
        icon: ChefHat,
        action: "sub-kitchen:read",
        match: "prefix",
      },
      {
        label: "Requests",
        href: "/branch/requests",
        icon: ClipboardList,
        action: "branch-requests:read",
        match: "prefix",
      },
      {
        label: "Incoming",
        href: "/branch/deliveries",
        icon: PackageCheck,
        action: "branch-inventory:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        label: "Sales",
        href: "/branch/sales",
        icon: TrendingUp,
        action: "branch-sales:read",
        match: "exact",
      },
      {
        label: "Planning",
        href: "/branch/planning",
        icon: LineChart,
        action: "branch-planning:read",
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
