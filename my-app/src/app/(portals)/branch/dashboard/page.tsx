"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Package,
  PackageCheck,
  Receipt,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useBranchCustomers,
  useBranchDeliveries,
  useBranchInventory,
  useBranchOrders,
  useBranchRequestsSummary,
  useBranchRestaurantProductionMode,
} from "@/lib/hooks/use-branch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubKitchenModeBanner } from "@/components/dashboard/SubKitchenModeBanner";
import { localDateOf, toLocalDateString } from "@/lib/date-range";
import { formatDate } from "@/lib/utils";
import { displayName } from "@/lib/types/super-admin";

/** Stock within this many days of expiry is surfaced on the dashboard. */
const NEAR_EXPIRY_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** Local calendar day as YYYY-MM-DD. Kept out of render to stay lint-pure. */
function todayKey(): string {
  return toLocalDateString(new Date());
}

/** Local calendar day N days from now, YYYY-MM-DD. */
function daysFromNowKey(n: number): string {
  return toLocalDateString(new Date(Date.now() + n * MS_PER_DAY));
}

/**
 * The real branch dashboard, replacing the Phase 0 `PortalDashboard`
 * placeholder. Mirrors the kitchen dashboard's shape: a row of at-a-glance
 * tiles, then the one thing a branch needs pushed at them — what's about to
 * expire.
 */
export default function BranchDashboardPage() {
  const { user, can } = useAuth();
  const orders = useBranchOrders();
  const customers = useBranchCustomers();
  const inventory = useBranchInventory();
  const production = useBranchRestaurantProductionMode();
  // One indexed call: open = raised but not yet received and not rejected.
  // Replaces the earlier total − received − rejected derivation now that the
  // backend ships GET /branch/requests/summary.
  const requestsSummary = useBranchRequestsSummary();
  const deliveries = useBranchDeliveries();

  const rows = inventory.data ?? [];
  const inStock = rows.filter((i) => i.quantity > 0);

  // Stock expiring within the next 7 days (today through +7), still on hand.
  // In useMemo so the "now" is read once per data change, not every render.
  const expiringSoon = useMemo(() => {
    const today = todayKey();
    const cutoff = daysFromNowKey(NEAR_EXPIRY_DAYS);
    return (inventory.data ?? [])
      .filter((i) => {
        if (i.quantity <= 0 || !i.expiry_date) return false;
        const d = localDateOf(i.expiry_date);
        return d >= today && d <= cutoff;
      })
      .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""));
  }, [inventory.data]);

  // Incoming = dispatched by the kitchen, not yet received by this branch.
  const incomingCount = (deliveries.data ?? []).filter((d) => d.status === "DISPATCHED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          {user ? `Hello, ${displayName(user).split(" ")[0]}` : "Branch"}
        </h1>
        <p className="mt-1 text-sm text-muted">Today at this branch.</p>
      </div>

      {production.data && (
        <SubKitchenModeBanner
          productionMode={production.data.production_mode}
          guidance={production.data.production_guidance}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          value={inStock.length}
          icon={Package}
          href={can("branch-inventory:read") ? "/branch/inventory" : undefined}
        />
        <Stat
          label="Open requests"
          value={requestsSummary.data?.open ?? 0}
          icon={ClipboardList}
          href={can("branch-requests:read") ? "/branch/requests" : undefined}
        />
        <Stat
          label="Incoming"
          value={incomingCount}
          icon={PackageCheck}
          href={can("branch-inventory:read") ? "/branch/deliveries" : undefined}
        />
        <Stat
          label={`Expiring ≤ ${NEAR_EXPIRY_DAYS}d`}
          value={expiringSoon.length}
          icon={TriangleAlert}
          tone={expiringSoon.length > 0 ? "warning" : "default"}
          href={can("branch-inventory:read") ? "/branch/inventory" : undefined}
        />
      </div>

      {/* Expiring soon — the one thing that rots if ignored, full width. */}
      <Card className={expiringSoon.length > 0 ? "border-warning/40" : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TriangleAlert className="size-4 text-warning" aria-hidden />
            Expiring soon
          </CardTitle>
          <CardDescription>
            Stock within {NEAR_EXPIRY_DAYS} days of its expiry date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : expiringSoon.length === 0 ? (
            <p className="text-sm text-muted">Nothing expiring soon. Good.</p>
          ) : (
            <ul className="space-y-2">
              {expiringSoon.slice(0, 8).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-content">{item.product_name}</span>
                  <span className="shrink-0 text-xs text-warning">
                    {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                  </span>
                </li>
              ))}
              {expiringSoon.length > 8 && (
                <li className="pt-1 text-xs text-faint">+{expiringSoon.length - 8} more</li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taking orders</CardTitle>
          <CardDescription>
            The till prices, takes payment, prints tickets and keeps working when the connection
            drops.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/pos">
              Open the till
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof Receipt;
  href?: string;
  tone?: "default" | "warning";
}) {
  const accent =
    tone === "warning" && value > 0 ? "bg-warning/10 text-warning" : "bg-brand/10 text-brand";
  const body = (
    <Card className={href ? "transition hover:border-brand hover:shadow-soft" : undefined}>
      <CardContent className="flex items-center gap-3 py-5">
        <span className={`grid size-10 place-items-center rounded-xl ${accent}`}>
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
