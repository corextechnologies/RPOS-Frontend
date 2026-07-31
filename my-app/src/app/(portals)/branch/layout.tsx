"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import { BRANCH_PORTAL_ROLES } from "@/lib/auth/roles";

/**
 * The Branch portal is the manager's. A branch CHEF is BRANCH_STAFF and belongs
 * to the Sub-kitchen portal instead — `postAuthPath` sends them there and
 * `SubKitchenShell` keeps them there, so no fork is needed here.
 */
export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={BRANCH_PORTAL_ROLES}>{children}</ProtectedPortalLayout>;
}
