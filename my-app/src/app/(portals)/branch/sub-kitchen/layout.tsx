"use client";

import { SubKitchenTabs } from "@/components/branch/sub-kitchen/SubKitchenTabs";
import { EmptyState } from "@/components/ui/state";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

/**
 * The branch prep station. Sits inside the branch portal (manager-only for now;
 * the Chef gets routed here once portal `position` lands), with a tab bar over
 * the board, stock, recipes, waste, sold-out, and overview screens.
 */
export default function SubKitchenLayout({ children }: { children: React.ReactNode }) {
  const { can } = useAuth();

  if (!can("sub-kitchen:read")) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="Not available"
            description="Your role does not have access to the sub-kitchen."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Sub-kitchen
        </h1>
        <p className="mt-1 text-sm text-muted">
          Final prep at this branch — the board, recipes, stock, waste, and sold-out.
        </p>
      </div>

      <SubKitchenTabs />

      {children}
    </div>
  );
}
