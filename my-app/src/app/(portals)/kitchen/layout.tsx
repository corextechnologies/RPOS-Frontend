"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import type { UserRole } from "@/lib/types/super-admin";

/** The Kitchen portal is manager-only; kitchen staff are a roster, not users. */
const KITCHEN_ROLES: readonly UserRole[] = ["KITCHEN_MANAGER"];

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={KITCHEN_ROLES}>{children}</ProtectedPortalLayout>;
}
