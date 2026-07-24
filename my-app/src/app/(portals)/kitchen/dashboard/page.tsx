"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Factory,
  Inbox,
  Plus,
  Send,
  TriangleAlert,
} from "lucide-react";
import { PortalLoadingScreen } from "@/components/layout/PortalShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KitchenStatusBadge } from "@/components/kitchen/requests/KitchenStatusBadge";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { useAuth } from "@/lib/auth";
import {
  useKitchenCatalogue,
  useKitchenProduction,
} from "@/lib/hooks/use-kitchen-recipes";
import {
  KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS,
  useKitchenInventory,
  useKitchenNearExpiry,
} from "@/lib/hooks/use-kitchen-inventory";
import {
  useKitchenBranchRequests,
  useKitchenWarehouseRequests,
} from "@/lib/hooks/use-kitchen-requests";
import { useKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import { displayName } from "@/lib/types/super-admin";
import type { KitchenRequest } from "@/lib/types/kitchen";
import type { ProductionTarget } from "@/lib/types/production-target";
import type { ProductionRun } from "@/lib/types/branch";
import { formatDate } from "@/lib/utils";

/** Statuses that mean the kitchen still owes work on a forwarded branch request. */
const TO_PRODUCE_STATUSES = new Set(["FORWARDED_TO_KITCHEN", "IN_PRODUCTION"]);

/** A normalized in-flight work item, from any of the kitchen's request types. */
type PipelineItem = {
  id: string;
  type: "Branch request" | "Warehouse request" | "Production target";
  /** First product line, e.g. "Flour" or "Flour +2 more". */
  label: string;
  lineCount: number;
  /** ISO timestamp the item was raised/created. */
  raised: string;
  badge: React.ReactNode;
  href: string;
};

/**
 * The head chef's home. Replaces the Phase 0 placeholder with the things a
 * kitchen lead actually needs pushed at them: what's about to expire, what
 * branches are waiting on, and what's been made — not numbers they'd go looking
 * for.
 */
export default function KitchenDashboardPage() {
  const { user, can } = useAuth();
  const router = useRouter();

  const inventory = useKitchenInventory();
  const catalogue = useKitchenCatalogue();
  const nearExpiry = useKitchenNearExpiry(KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS);
  const production = useKitchenProduction();
  const branchRequests = useKitchenBranchRequests({
    status: "all",
    page: 1,
    page_size: 50,
  });
  const warehouseRequests = useKitchenWarehouseRequests({
    status: "all",
    page: 1,
    page_size: 50,
  });
  const productionTargets = useKitchenProductionTargets(
    undefined,
    can("kitchen-production-targets:read"),
  );

  const finishedIds = useMemo(
    () => new Set((catalogue.data ?? []).map((c) => c.id)),
    [catalogue.data],
  );

  // Distinct finished products currently on hand — the things ready to dispatch.
  const readyToDispatch = useMemo(() => {
    const seen = new Set<string>();
    for (const item of inventory.data ?? []) {
      if (item.quantity > 0 && finishedIds.has(item.product_id)) {
        seen.add(item.product_id);
      }
    }
    return seen.size;
  }, [inventory.data, finishedIds]);

  const toProduce = useMemo(
    () => (branchRequests.data?.items ?? []).filter((r) => TO_PRODUCE_STATUSES.has(r.status)),
    [branchRequests.data],
  );

  // Every in-flight work item across all three request types the kitchen
  // touches — branch requests, warehouse requests, and production targets —
  // that has not yet reached its terminal (dispatched/received) state. Each
  // drops off this list the moment it is dispatched or received.
  const pendingDispatch = useMemo<PipelineItem[]>(() => {
    const items: PipelineItem[] = [];

    for (const t of productionTargets.data ?? []) {
      if (t.status !== "DISPATCHED" && t.status !== "RECEIVED") {
        items.push({
          id: `target-${t.id}`,
          type: "Production target",
          label: summarizeTargetLines(t),
          lineCount: t.lines.length,
          raised: t.created_at,
          badge: <ProductionTargetStatusBadge status={t.status} />,
          href:
            t.status === "COMPLETED" || t.status === "ALLOCATED"
              ? `/kitchen/requests/dispatch/target/${t.id}`
              : `/kitchen/production-targets/${t.id}`,
        });
      }
    }

    for (const r of branchRequests.data?.items ?? []) {
      if (r.status !== "DISPATCHED" && r.status !== "RECEIVED" && r.status !== "REJECTED") {
        items.push({
          id: `branch-${r.id}`,
          type: "Branch request",
          label: summarizeLines(r),
          lineCount: r.line_items.length,
          raised: r.created_at,
          badge: <KitchenStatusBadge status={r.status} />,
          href: "/kitchen/requests/branch",
        });
      }
    }

    for (const r of warehouseRequests.data?.items ?? []) {
      if (r.status !== "RECEIVED" && r.status !== "REJECTED") {
        items.push({
          id: `warehouse-${r.id}`,
          type: "Warehouse request",
          label: summarizeLines(r),
          lineCount: r.line_items.length,
          raised: r.created_at,
          badge: <KitchenStatusBadge status={r.status} />,
          href: "/kitchen/requests/warehouse",
        });
      }
    }

    return items;
  }, [productionTargets.data, branchRequests.data, warehouseRequests.data]);

  const pipelineLoading =
    branchRequests.isLoading || warehouseRequests.isLoading || productionTargets.isLoading;

  const madeToday = useMemo(() => {
    const today = todayKey();
    return (production.data ?? []).filter((r) => r.created_at.slice(0, 10) === today).length;
  }, [production.data]);

  const expiring = nearExpiry.data ?? [];
  const recentRuns = (production.data ?? []).slice(0, 5);

  if (!user) return <PortalLoadingScreen />;

  const canSeeBranchRequests = can("kitchen-branch-requests:read");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          {`Hello, ${displayName(user).split(" ")[0]}`}
        </h1>
        <p className="mt-1 text-sm text-muted">What needs your kitchen today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Ready to dispatch"
          value={readyToDispatch}
          icon={Boxes}
          href="/kitchen/production"
        />
        <Stat
          label={`Expiring ≤ ${KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS}d`}
          value={expiring.length}
          icon={TriangleAlert}
          href="/kitchen/waste"
          tone={expiring.length > 0 ? "warning" : "default"}
        />
        <Stat
          label="To produce"
          value={toProduce.length}
          icon={Inbox}
          href={canSeeBranchRequests ? "/kitchen/requests/branch" : undefined}
          tone={toProduce.length > 0 ? "warning" : "default"}
        />
        <Stat label="Made today" value={madeToday} icon={Factory} href="/kitchen/production" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expiring soon — the one thing that rots if ignored, so it leads. */}
        <Card className={expiring.length > 0 ? "border-warning/40" : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-warning" aria-hidden />
              Expiring soon
            </CardTitle>
            <CardDescription>
              Stock within {KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS} days of its expiry date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nearExpiry.isLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : expiring.length === 0 ? (
              <p className="text-sm text-muted">Nothing expiring soon. Good.</p>
            ) : (
              <ul className="space-y-2">
                {expiring.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-content">{item.product.name}</span>
                    <span className="shrink-0 text-xs text-warning">
                      {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                    </span>
                  </li>
                ))}
                {expiring.length > 6 && (
                  <li className="pt-1 text-xs text-faint">+{expiring.length - 6} more</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* To produce — branch requests Admin forwarded here, still open. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4 text-brand" aria-hidden />
              To produce
            </CardTitle>
            <CardDescription>Branch requests waiting on this kitchen.</CardDescription>
          </CardHeader>
          <CardContent>
            {branchRequests.isLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : toProduce.length === 0 ? (
              <p className="text-sm text-muted">Nothing waiting to be produced.</p>
            ) : (
              <ul className="space-y-2">
                {toProduce.slice(0, 6).map((req) => (
                  <li key={req.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-content">
                      {summarizeLines(req)}
                    </span>
                    <KitchenStatusBadge status={req.status} />
                  </li>
                ))}
              </ul>
            )}
            {canSeeBranchRequests && toProduce.length > 0 && (
              <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2">
                <Link href="/kitchen/requests/branch">
                  View all
                  <ArrowRight className="ml-1 size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent production */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="size-4 text-brand" aria-hidden />
            Recent production
          </CardTitle>
          <CardDescription>The last few things this kitchen made.</CardDescription>
        </CardHeader>
        <CardContent>
          {production.isLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : recentRuns.length === 0 ? (
            <p className="text-sm text-muted">Nothing made yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentRuns.map((run) => {
                const output = outputOf(run);
                return (
                  <li key={run.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-content">
                      {output ? `${output.quantity}× ${output.product_name}` : "Run"}
                    </span>
                    <span className="text-xs text-muted">{formatDate(run.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending dispatch — every in-flight work item (branch, warehouse, and
          production-target requests) that has not yet been dispatched/received */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="size-4 text-brand" aria-hidden />
            Pending dispatch
          </CardTitle>
          <CardDescription>
            Every request still in the pipeline — branch, warehouse, and production
            targets. Each drops off once it&apos;s dispatched or received.
          </CardDescription>
        </CardHeader>
        <CardContent className={pendingDispatch.length > 0 ? "p-0" : undefined}>
          {pipelineLoading ? (
            <p className="p-6 text-sm text-muted">Loading…</p>
          ) : pendingDispatch.length === 0 ? (
            <p className="text-sm text-muted">Nothing in the pipeline right now.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Items</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Raised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDispatch.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(item.href)}
                  >
                    <TableCell>
                      <p className="font-medium text-content">{item.label}</p>
                      <p className="text-xs text-muted">
                        {item.lineCount} line item{item.lineCount === 1 ? "" : "s"}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted">{item.type}</TableCell>
                    <TableCell>{item.badge}</TableCell>
                    <TableCell className="text-muted">{formatDate(item.raised)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/kitchen/production">
            <Plus className="mr-1.5 size-4" aria-hidden />
            Make something
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/kitchen/requests/dispatch">
            <Send className="mr-1.5 size-4" aria-hidden />
            Dispatch to Admin
          </Link>
        </Button>
      </div>
    </div>
  );
}

function summarizeLines(request: KitchenRequest): string {
  const [first] = request.line_items;
  if (!first) return "-";
  const extra = request.line_items.length - 1;
  return extra > 0 ? `${first.product_name} +${extra} more` : first.product_name;
}

function summarizeTargetLines(target: ProductionTarget): string {
  const [first] = target.lines;
  if (!first) return "-";
  const extra = target.lines.length - 1;
  return extra > 0 ? `${first.product_name} +${extra} more` : first.product_name;
}

function outputOf(run: ProductionRun) {
  return run.lines.find((l) => l.role === "OUTPUT");
}

/** Local calendar day as YYYY-MM-DD, to match a run's ISO `created_at` prefix. */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
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
  icon: typeof Boxes;
  href?: string;
  tone?: "default" | "warning";
}) {
  const accent =
    tone === "warning" && value > 0
      ? "bg-warning/10 text-warning"
      : "bg-brand/10 text-brand";
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
