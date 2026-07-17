"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useBranchOrders } from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { NewBranchOrderDialog } from "@/components/branch/NewBranchOrderDialog";
import { PageState } from "@/components/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Info, Plus } from "lucide-react";

/**
 * Branch orders — the Phase 5 counter flow.
 *
 * Money here is decimal strings, because these are the original Phase 5
 * endpoints and they are deliberately unchanged. The POS at `/pos` is the
 * minor-units surface. Do not add a total across the two.
 */
export default function BranchOrdersPage() {
  const { data, isLoading, error } = useBranchOrders();
  const { can } = useAuth();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Orders
          </h1>
          <p className="mt-1 text-sm text-muted">Orders taken at this branch.</p>
        </div>
        {can("branch-orders:create") && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden />
            New order
          </Button>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <span>
          The till at <code className="rounded bg-surface px-1 py-0.5 text-xs">/pos</code> takes
          payment and prints tickets. Recording an order here is the fallback for when there
          isn&apos;t one — it prices from the catalogue but takes no money.
        </span>
      </p>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data?.items}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load orders"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No orders yet"
        emptyDescription="Orders taken at this branch will appear here."
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-muted">{order.id}</TableCell>
                    <TableCell className="text-content">
                      {order.customer_name ?? <span className="text-faint">Walk-in</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">
                      {order.lines.length}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-content">
                      {order.total}
                    </TableCell>
                    <TableCell className="text-muted">{formatDate(order.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>

      <NewBranchOrderDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
