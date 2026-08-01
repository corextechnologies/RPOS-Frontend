"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AUTH_ROUTES, requiresPasswordChange } from "@/lib/auth/actions";
import { isBranchChef } from "@/lib/auth/capabilities";
import { SUB_KITCHEN_HOME } from "@/lib/auth/roles";
import { SUB_KITCHEN_NAV } from "@/lib/nav/sub-kitchen";
import { PortalLoadingScreen, PortalShell } from "@/components/layout/PortalShell";

/**
 * The Sub-kitchen portal shell.
 *
 * Two people get in, for different reasons and with different freedom:
 *
 * - A **CHEF** is BRANCH_STAFF by role, so without this they'd inherit the till
 *   shell (POS label, `/pos` home) and role-filtered nav into the counter
 *   screens. This is their whole application, so they are also *pinned* here —
 *   any path outside `/sub-kitchen` bounces back.
 * - The **branch manager** keeps every branch capability and may need to cover
 *   the station, so they are admitted with full operate — but not pinned; the
 *   rest of their portal is still theirs.
 *
 * Admission is by role/position (this file). What either of them may *do* once
 * inside is decided per-button by capability, mirroring the server.
 */
export function SubKitchenShell({ children }: { children: React.ReactNode }) {
  const { user, loading, can, hasCapability } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const chef = isBranchChef(user);
  // The OR keeps a manager in even if their capability list lags the role.
  const manager = can("sub-kitchen:read") || hasCapability("PREP_READ");
  const admitted = chef || manager;

  const onSubKitchen =
    pathname === SUB_KITCHEN_HOME || pathname.startsWith(`${SUB_KITCHEN_HOME}/`);
  // Only the chef is confined to the station; a manager roams their own portal.
  const misplaced = chef && !onSubKitchen;

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
    if (!admitted) {
      router.replace(AUTH_ROUTES.login);
      return;
    }
    if (misplaced) router.replace(SUB_KITCHEN_HOME);
  }, [user, loading, admitted, misplaced, router]);

  if (loading || !user || requiresPasswordChange(user) || !admitted || misplaced) {
    return <PortalLoadingScreen />;
  }

  return (
    <PortalShell
      role={user.role}
      sections={SUB_KITCHEN_NAV}
      portalLabel="Sub-kitchen"
      portalHome={SUB_KITCHEN_HOME}
    >
      {children}
    </PortalShell>
  );
}
