"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES, requiresPasswordChange } from "@/lib/auth/actions";
import { isBranchChef } from "@/lib/auth/capabilities";
import { SUB_KITCHEN_HOME } from "@/lib/auth/roles";
import { CHEF_NAV } from "@/lib/nav/branch";
import { PortalLoadingScreen, PortalShell } from "@/components/layout/PortalShell";

/**
 * The Branch portal shell for a CHEF. A Chef is BRANCH_STAFF by role, so they'd
 * otherwise inherit the till shell (POS label, `/pos` home) and, via role-based
 * nav filtering, the counter screens. Instead they get a sub-kitchen-only shell
 * and are pinned to the sub-kitchen sub-area — any other `/branch` path bounces
 * back here. Actions inside are gated per-capability, not by this shell.
 */
export function BranchChefShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const onSubKitchen =
    pathname === SUB_KITCHEN_HOME || pathname.startsWith(`${SUB_KITCHEN_HOME}/`);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (requiresPasswordChange(user)) {
      router.replace(AUTH_ROUTES.changePassword);
      return;
    }
    if (!isBranchChef(user)) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (!onSubKitchen) {
      router.replace(SUB_KITCHEN_HOME);
    }
  }, [user, loading, onSubKitchen, router]);

  if (
    loading ||
    !user ||
    requiresPasswordChange(user) ||
    !isBranchChef(user) ||
    !onSubKitchen
  ) {
    return <PortalLoadingScreen />;
  }

  return (
    <PortalShell
      role="BRANCH_STAFF"
      sections={CHEF_NAV}
      portalLabel="Sub-kitchen"
      portalHome={SUB_KITCHEN_HOME}
    >
      {children}
    </PortalShell>
  );
}
