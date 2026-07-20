import {
  BookOpen,
  Building2,
  CookingPot,
  DollarSign,
  Inbox,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Tag,
  TicketPercent,
  Users,
  Utensils,
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
        label: "Inventory",
        href: "/admin/inventory",
        icon: Package,
        // Not the Warehouse's "inventory:read" — that action is scoped to a
        // single warehouse's own stock. This page is Admin's cross-location
        // oversight, which is what "overview:read" already grants.
        action: "overview:read",
        match: "exact",
      },
      {
        label: "Pricing",
        href: "/admin/pricing",
        icon: Tag,
        action: "pricing:read",
        match: "exact",
      },
      // The POS back-office. Not the till — these are the things the till reads
      // and cannot itself change: what's sellable, what may be taken off a
      // bill, and what a sale consumes.
      {
        label: "Menu",
        href: "/admin/menu",
        icon: BookOpen,
        action: "menu:read",
        match: "exact",
      },
      {
        label: "Discounts",
        href: "/admin/discounts",
        icon: TicketPercent,
        action: "discounts:read",
        match: "exact",
      },
      // {
      //   label: "Recipes",
      //   href: "/admin/recipes",
      //   icon: Utensils,
      //   action: "recipes:read",
      //   match: "exact",
      // },
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
