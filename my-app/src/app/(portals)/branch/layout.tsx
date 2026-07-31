"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import { BranchChefShell } from "@/components/layout/BranchChefShell";
import { PortalLoadingScreen } from "@/components/layout/PortalShell";
import { BRANCH_PORTAL_ROLES } from "@/lib/auth/roles";
import { isBranchChef } from "@/lib/auth/capabilities";
import { useAuth } from "@/lib/auth";

/**
 * The Branch portal admits managers to the full portal, and a branch CHEF to the
 * sub-kitchen sub-area alone. Everyone else is redirected by whichever guard
 * runs (the manager path's `ProtectedPortalLayout`, or the Chef shell).
 */
export default function BranchLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PortalLoadingScreen />;

  if (isBranchChef(user)) {
    return <BranchChefShell>{children}</BranchChefShell>;
  }

  return <ProtectedPortalLayout role={BRANCH_PORTAL_ROLES}>{children}</ProtectedPortalLayout>;
}
