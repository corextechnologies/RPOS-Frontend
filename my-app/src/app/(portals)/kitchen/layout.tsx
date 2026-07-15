"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import type { UserRole } from "@/lib/types/super-admin";

/** Sub-chefs get the same screens; the manager-only actions gate themselves. */
const KITCHEN_ROLES: readonly UserRole[] = ["KITCHEN_MANAGER", "SUB_CHEF"];

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={KITCHEN_ROLES}>{children}</ProtectedPortalLayout>;
}
