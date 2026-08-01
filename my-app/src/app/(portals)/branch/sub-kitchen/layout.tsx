"use client";

import {
  SubKitchenTabs,
  type SubKitchenTab,
} from "@/components/branch/sub-kitchen/SubKitchenTabs";
import { EmptyState } from "@/components/ui/state";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

/**
 * The manager's window onto the sub-kitchen: numbers and the live board, and
 * nothing that acts. Every operating control — batching, completing, recipes,
 * waste — lives in the Sub-kitchen portal.
 *
 * This is display scoping, not a capability removal: the manager still holds
 * every branch capability. The point is that a supervisor's dashboard shouldn't
 * offer a button that belongs on the chef's bench.
 *
 * Overview is the landing page — a supervisor wants the numbers first, and the
 * tab you arrive on should be the one that reads first.
 */
const TABS: SubKitchenTab[] = [
  { label: "Overview", href: "/branch/sub-kitchen", index: true },
  { label: "Board", href: "/branch/sub-kitchen/board" },
];

export default function BranchSubKitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can, hasCapability } = useAuth();

  // The OR keeps the manager in even if their capability list lags the role.
  if (!can("sub-kitchen:read") && !hasCapability("PREP_READ")) {
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
          What the prep station is working on. Read-only from here.
        </p>
      </div>

      <SubKitchenTabs tabs={TABS} />

      {children}
    </div>
  );
}
