"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role="BRANCH_MANAGER">{children}</ProtectedPortalLayout>;
}
