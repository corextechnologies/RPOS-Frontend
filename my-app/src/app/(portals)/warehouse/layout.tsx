"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import { WAREHOUSE_PORTAL_ROLES } from "@/lib/auth/roles";

/** Staff get the same screens; manager-only actions (staff provisioning) gate themselves. */
export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={WAREHOUSE_PORTAL_ROLES}>{children}</ProtectedPortalLayout>;
}
