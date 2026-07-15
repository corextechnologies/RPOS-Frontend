import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PORTAL_LABEL } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/types/super-admin";

const PLACEHOLDER_COPY: Record<UserRole, { title: string; description: string }> = {
  SUPER_ADMIN: {
    title: "Super Admin dashboard",
    description: "Cross-tenant management for restaurants, plans, and billing.",
  },
  ADMIN: {
    title: "Admin dashboard",
    description: "Restaurant-wide overview for branches, staff, inventory, and requests.",
  },
  WAREHOUSE_MANAGER: {
    title: "Warehouse dashboard",
    description: "Stock overview, intake, expiry alerts, and incoming release requests.",
  },
  KITCHEN_MANAGER: {
    title: "Kitchen dashboard",
    description: "Production queue, waste summary, and stock requests from branches.",
  },
  SUB_CHEF: {
    title: "Kitchen dashboard",
    description: "Production queue and stock on hand. Logging waste is yours; the rest is read-only.",
  },
  BRANCH_MANAGER: {
    title: "Branch dashboard",
    description: "Today's sales, pending requests, and branch inventory at a glance.",
  },
};

export function PortalDashboard({ role }: { role: UserRole }) {
  const copy = PLACEHOLDER_COPY[role];
  const label = PORTAL_LABEL[role];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted">{copy.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{label} portal shell</CardTitle>
          <CardDescription>
            Phase 0 foundation is active. Business screens for this portal arrive in later phases.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted">
          You are authenticated and routed to the correct role-scoped area. Navigation, layout, and
          access control are shared across all five portals.
        </CardContent>
      </Card>
    </div>
  );
}
