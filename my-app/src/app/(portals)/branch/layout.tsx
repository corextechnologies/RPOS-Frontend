"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import { BRANCH_PORTAL_ROLES } from "@/lib/auth/roles";

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={BRANCH_PORTAL_ROLES}>{children}</ProtectedPortalLayout>;
}
