"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Logomark } from "@/components/icons";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import type { UserRole } from "@/lib/types/super-admin";
import { PORTAL_HOME, PORTAL_LABEL } from "@/lib/auth/roles";
import { navForRole } from "@/lib/nav";

interface PortalShellProps {
  role: UserRole;
  children: React.ReactNode;
}

export function PortalShell({ role, children }: PortalShellProps) {
  const [drawer, setDrawer] = useState(false);
  const portalLabel = PORTAL_LABEL[role];
  const portalHome = PORTAL_HOME[role];
  const sections = navForRole(role);

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface/40 lg:block">
        <Sidebar sections={sections} portalLabel={portalLabel} />
      </aside>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            sections={sections}
            portalLabel={portalLabel}
            onNavigate={() => setDrawer(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <Topbar
          portalLabel={portalLabel}
          portalHome={portalHome}
          onMenu={() => setDrawer(true)}
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PortalLoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg text-brand">
      <Logomark size={40} className="animate-pulse" />
    </div>
  );
}
