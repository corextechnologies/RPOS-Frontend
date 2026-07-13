import type { IconName } from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Any one of these permissions grants access. Empty = always visible. */
  permissions?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
  },
  {
    title: "Organization",
    items: [
      {
        label: "Organizations",
        href: "/organizations",
        icon: "org",
        permissions: ["organizations:read"],
      },
      {
        label: "Branches",
        href: "/branches",
        icon: "branch",
        permissions: ["branches:read"],
      },
    ],
  },
  {
    title: "Access Control",
    items: [
      { label: "Users", href: "/users", icon: "users", permissions: ["users:read"] },
      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: "shield",
        permissions: ["roles:read"],
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        label: "Master Data",
        href: "/master-data",
        icon: "layers",
        permissions: ["master_data:read"],
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: "settings",
};

export function visibleFor(section: NavSection, can: (p: string) => boolean): NavItem[] {
  return section.items.filter(
    (i) => !i.permissions || i.permissions.some((p) => can(p)),
  );
}
