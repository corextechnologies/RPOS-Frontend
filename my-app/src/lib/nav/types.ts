import type { LucideIcon } from "lucide-react";
import type { AuthAction } from "@/lib/auth/actions";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  action?: AuthAction;
  match?: "exact" | "prefix";
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
