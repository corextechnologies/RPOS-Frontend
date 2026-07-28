import {
  Boxes,
  ClipboardCheck,
  Factory,
  Inbox,
  LayoutDashboard,
  Send,
  Settings,
  Tags,
  Target,
  TriangleAlert,
  Truck,
  Users,
  Utensils,
} from "lucide-react";
import type { NavSection } from "./types";

/**
 * The Kitchen portal is manager-only. Every business item still carries an
 * `action` and is filtered through `visibleNavItems`, so a manager missing a
 * capability simply never sees that entry (an empty section renders nothing).
 */
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
    title: "Production",
    items: [
      {
        label: "What we make",
        href: "/kitchen/recipes",
        icon: Utensils,
        action: "kitchen-inventory:read",
        match: "exact",
      },
      {
        label: "Production",
        href: "/kitchen/production",
        icon: Factory,
        action: "kitchen-inventory:read",
        match: "exact",
      },
      {
        label: "Production targets",
        href: "/kitchen/production-targets",
        icon: Target,
        action: "kitchen-production-targets:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "Stock",
    items: [
      {
        label: "Inventory",
        href: "/kitchen/inventory",
        icon: Boxes,
        action: "kitchen-inventory:read",
        match: "exact",
      },
      {
        label: "Labels",
        href: "/kitchen/labels",
        icon: Tags,
        action: "kitchen-labels:read",
        match: "exact",
      },
      {
        label: "Waste & expiry",
        href: "/kitchen/waste",
        icon: TriangleAlert,
        action: "kitchen-stock:waste",
        match: "exact",
      },
      {
        label: "Product counts",
        href: "/kitchen/counts",
        icon: ClipboardCheck,
        action: "kitchen-counts:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "Requests",
    items: [
      {
        label: "Branch requests",
        href: "/kitchen/requests/branch",
        icon: Inbox,
        action: "kitchen-branch-requests:read",
        match: "prefix",
      },
      {
        label: "Warehouse requests",
        href: "/kitchen/requests/warehouse",
        icon: Truck,
        action: "kitchen-warehouse-requests:read",
        match: "prefix",
      },
      {
        label: "Dispatch to Admin",
        href: "/kitchen/requests/dispatch",
        icon: Send,
        action: "kitchen-inventory:read",
        match: "prefix",
      },
    ],
  },
  {
    title: "People",
    items: [
      {
        label: "Kitchen staff",
        href: "/kitchen/staff",
        icon: Users,
        action: "kitchen-staff:read",
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
