"use client";

import { useBranchOrders } from "@/lib/hooks/use-branch";
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

/**
 * Branch orders — the Phase 5 counter flow.
 *
 * Money here is decimal strings, because these are the original Phase 5
 * endpoints and they are deliberately unchanged. The POS at `/pos` is the
 * minor-units surface. Do not add a total across the two.
 */
export default function BranchOrdersPage() {
  const { data, isLoading, error } = useBranchOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Orders
        </h1>
        <p className="mt-1 text-sm text-muted">Orders taken at this branch.</p>
      </div>

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
    </div>
  );
}
