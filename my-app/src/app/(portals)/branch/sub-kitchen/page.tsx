"use client";

import { useMemo } from "react";
import { PackageX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/ui/page-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubKitchenStatsPanel } from "@/components/branch/sub-kitchen/SubKitchenStatsPanel";
import { useSubKitchenInventory } from "@/lib/hooks/use-sub-kitchen";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import type { BranchInventoryItem } from "@/lib/types/branch";

interface OutOfStockRow {
  productId: string;
  name: string;
  unit: BranchInventoryItem["stock_unit"];
}

/**
 * Products the station has nothing left of.
 *
 * Derived from on-hand rather than read from an availability list, because
 * there is no longer such a list: the server computes sellability from stock, so
 * "on hand is zero" *is* "sold out on the till". Totalled across batches first —
 * a product with an empty batch and a full one is not out of stock.
 */
function outOfStock(items: BranchInventoryItem[]): OutOfStockRow[] {
  const totals = new Map<string, { row: OutOfStockRow; quantity: number }>();
  for (const item of items) {
    const prev = totals.get(item.product_id);
    if (prev) {
      prev.quantity += item.quantity;
      continue;
    }
    totals.set(item.product_id, {
      quantity: item.quantity,
      row: {
        productId: item.product_id,
        name: item.product_name,
        unit: item.stock_unit,
      },
    });
  }
  return [...totals.values()]
    .filter((t) => t.quantity <= 0)
    .map((t) => t.row)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function BranchSubKitchenOverviewPage() {
  const inventory = useSubKitchenInventory();
  const rows = useMemo(() => outOfStock(inventory.data ?? []), [inventory.data]);

  return (
    <div className="space-y-6">
      <SubKitchenStatsPanel />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="size-4 text-muted" aria-hidden />
            Out of stock
          </CardTitle>
          <CardDescription>
            Nothing left on the shelf, so the tills have already stopped selling these.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PageState
            isLoading={inventory.isLoading}
            isError={inventory.isError}
            data={rows}
            isEmpty={(r) => r.length === 0}
            errorTitle="Couldn't load stock"
            errorDescription={
              inventory.error instanceof Error ? inventory.error.message : undefined
            }
            onRetry={() => inventory.refetch()}
            emptyTitle="Everything's in stock"
            emptyDescription="No product the station holds has run out."
          >
            {(stockRows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium text-content">{row.name}</TableCell>
                      <TableCell className="text-muted">
                        {stockUnitColumnLabel(row.unit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageState>
        </CardContent>
      </Card>
    </div>
  );
}
