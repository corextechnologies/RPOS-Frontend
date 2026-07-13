"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role="SUPER_ADMIN">{children}</ProtectedPortalLayout>;
}
