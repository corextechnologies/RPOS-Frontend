"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Package, Receipt, TriangleAlert, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useBranchCustomers,
  useBranchDeliveries,
  useBranchInventory,
  useBranchOrders,
  useBranchRequests,
  useBranchRestaurantProductionMode,
} from "@/lib/hooks/use-branch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "@/components/admin/requests/RequestStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Skeleton } from "@/components/ui/skeleton";
import { SubKitchenModeBanner } from "@/components/dashboard/SubKitchenModeBanner";
import { CloseDayButton } from "@/components/branch/CloseDayButton";
import { localDateOf, toLocalDateString } from "@/lib/date-range";
import { formatDate } from "@/lib/utils";
import { displayName } from "@/lib/types/super-admin";
import type { StockRequest } from "@/lib/types/admin";
import type { BranchDelivery } from "@/lib/types/branch";

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

/** First product line, e.g. "Coke" or "Coke +2 more". */
function summarizeRequestLines(req: StockRequest): string {
  const [first] = req.line_items;
  if (!first) return "-";
  const extra = req.line_items.length - 1;
  return extra > 0 ? `${first.product_name} +${extra} more` : first.product_name;
}

/**
 * The real branch dashboard, replacing the Phase 0 `PortalDashboard`
 * placeholder: a row of at-a-glance tiles, then the branch's live request and
 * incoming pipelines (mirroring Admin's recent-requests table) and what's about
 * to expire.
 */
export default function BranchDashboardPage() {
  const { user, can } = useAuth();
  const orders = useBranchOrders();
  const customers = useBranchCustomers();
  const inventory = useBranchInventory();
  const production = useBranchRestaurantProductionMode();
  const requests = useBranchRequests({ page: 1, page_size: 5 });
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

  const recentRequests = (requests.data?.items ?? []).slice(0, 5);
  // Incoming = dispatched by the kitchen, not yet received by this branch.
  const incoming = (deliveries.data ?? []).filter((d) => d.status === "DISPATCHED").slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            {user ? `Hello, ${displayName(user).split(" ")[0]}` : "Branch"}
          </h1>
          <p className="mt-1 text-sm text-muted">Today at this branch.</p>
        </div>
        {can("branch-sales:read") && <CloseDayButton />}
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
      </div>

      {/* Requests — this branch's own asks, newest first (admin-style table). */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Requests</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/branch/requests">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {requests.isLoading ? (
            <TableSkeleton />
          ) : requests.isError ? (
            <ErrorState description="Failed to load requests." onRetry={() => requests.refetch()} />
          ) : recentRequests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              description="Stock you ask head office for will show up here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <p className="font-medium text-content">{summarizeRequestLines(req)}</p>
                      <p className="text-xs text-muted">
                        {req.line_items.length} line item(s)
                      </p>
                    </TableCell>
                    <TableCell>
                      <RequestStatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-muted">{formatDate(req.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Incoming — finished goods the kitchen dispatched, awaiting receipt. */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Incoming</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/branch/deliveries">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {deliveries.isLoading ? (
            <TableSkeleton />
          ) : deliveries.isError ? (
            <ErrorState
              description="Failed to load incoming stock."
              onRetry={() => deliveries.refetch()}
            />
          ) : incoming.length === 0 ? (
            <EmptyState
              title="Nothing incoming"
              description="Deliveries dispatched from the kitchen appear here until you receive them."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incoming.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium text-content">{d.product_name}</p>
                      {d.from_label && (
                        <p className="text-xs text-muted">from {d.from_label}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-content">
                      {d.quantity}
                    </TableCell>
                    <TableCell>
                      <DeliveryStatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-muted">{formatDate(d.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

/** DISPATCHED / RECEIVED badge for the incoming table. */
function DeliveryStatusBadge({ status }: { status: BranchDelivery["status"] }) {
  return (
    <Badge variant={status === "RECEIVED" ? "success" : "warning"}>
      {status === "RECEIVED" ? "Received" : "Dispatched"}
    </Badge>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
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
