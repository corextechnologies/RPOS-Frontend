"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role="KITCHEN_MANAGER">{children}</ProtectedPortalLayout>;
}
