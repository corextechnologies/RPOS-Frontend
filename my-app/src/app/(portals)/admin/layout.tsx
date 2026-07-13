"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role="ADMIN">{children}</ProtectedPortalLayout>;
}
