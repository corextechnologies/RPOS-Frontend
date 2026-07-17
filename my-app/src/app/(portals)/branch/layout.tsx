"use client";

import { ProtectedPortalLayout } from "@/components/layout/ProtectedPortalLayout";
import { BRANCH_PORTAL_ROLES } from "@/lib/auth/roles";

/**
 * Two roles, one portal — the same shape the Kitchen portal already uses for
 * KITCHEN_MANAGER + SUB_CHEF. Which actions are offered is decided per-action
 * by `canPerform`, not here.
 */
export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedPortalLayout role={BRANCH_PORTAL_ROLES}>{children}</ProtectedPortalLayout>;
}
