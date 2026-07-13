"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role="WAREHOUSE_MANAGER">{children}</ProtectedPortalLayout>;
}
