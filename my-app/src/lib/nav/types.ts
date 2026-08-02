import type { LucideIcon } from "lucide-react";
import type { AuthAction } from "@/lib/auth/actions";

/** Tenant-level capabilities a nav item can depend on. See useRestaurantFeatures. */
export type RestaurantFeature = "central_kitchen";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  action?: AuthAction;
  match?: "exact" | "prefix";
  /** Hidden when the tenant lacks this feature (e.g. no central kitchen). */
  requiresFeature?: RestaurantFeature;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
