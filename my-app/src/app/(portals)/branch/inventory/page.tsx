"use client";

import { useBranchInventory } from "@/lib/hooks/use-branch";
import { PageState } from "@/components/ui/page-state";
import { Badge } from "@/components/ui/badge";
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
 * Branch stock on hand.
 *
 * Readable by BRANCH_STAFF since the Phase 5 delta — a salesperson needs to see
 * what has run out. There is **no price column** and there must never be one:
 * cost is Admin-only and is absent from `BranchInventoryItem` structurally, not
 * hidden with CSS. If you find yourself wanting to add one, that's a different
 * endpoint and a different role.
 */
export default function BranchInventoryPage() {
  const { data, isLoading, error, refetch } = useBranchInventory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-muted">Stock on hand at this branch.</p>
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load inventory"
        errorDescription={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
        emptyTitle="No stock yet"
        emptyDescription="Stock allocated to this branch will appear here."
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium text-content">{item.product_name}</span>
                      {item.sku && (
                        <span className="ml-2 font-mono text-xs text-faint">{item.sku}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {item.batch_code || <span className="text-faint">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity === 0 ? (
                        <Badge variant="destructive">Out</Badge>
                      ) : (
                        <span className="tabular-nums text-content">{item.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                    </TableCell>
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
