"use client";

import Link from "next/link";
import { AlertTriangle, Package, Receipt, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useBranchCustomers, useBranchInventory, useBranchOrders } from "@/lib/hooks/use-branch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayName } from "@/lib/types/super-admin";

/**
 * The real branch dashboard, replacing the Phase 0 `PortalDashboard`
 * placeholder — the one whose copy promised "business screens for this portal
 * arrive in later phases".
 */
export default function BranchDashboardPage() {
  const { user, can } = useAuth();
  const orders = useBranchOrders();
  const customers = useBranchCustomers();
  const inventory = useBranchInventory();

  const outOfStock = (inventory.data ?? []).filter((i) => i.quantity === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          {user ? `Hello, ${displayName(user).split(" ")[0]}` : "Branch"}
        </h1>
        <p className="mt-1 text-sm text-muted">Today at this branch.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Orders"
          value={orders.data?.total ?? 0}
          icon={Receipt}
          href={can("branch-orders:read") ? "/branch/orders" : undefined}
        />
        <Stat
          label="Customers"
          value={customers.data?.total ?? 0}
          icon={Users}
          href={can("branch-customers:read") ? "/branch/customers" : undefined}
        />
        <Stat
          label="Products in stock"
          value={(inventory.data ?? []).filter((i) => i.quantity > 0).length}
          icon={Package}
          href={can("branch-inventory:read") ? "/branch/inventory" : undefined}
        />
      </div>

      {/* The one thing a branch actually needs pushed at them: what they can no
          longer sell. Everything else here is a number they could look up. */}
      {outOfStock.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" aria-hidden />
              Out of stock ({outOfStock.length})
            </CardTitle>
            <CardDescription>These can&apos;t be sold right now.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {outOfStock.slice(0, 12).map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm text-content"
                >
                  {item.product_name}
                </li>
              ))}
              {outOfStock.length > 12 && (
                <li className="px-2.5 py-1 text-sm text-faint">+{outOfStock.length - 12} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Receipt;
  href?: string;
}) {
  const body = (
    <Card className={href ? "transition hover:border-brand hover:shadow-soft" : undefined}>
      <CardContent className="flex items-center gap-3 py-5">
        <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="font-display text-2xl font-semibold tabular-nums text-content">{value}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
