"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
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
import { useSubKitchenInventory, useSubKitchenNearExpiry } from "@/lib/hooks/use-sub-kitchen";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import { formatDate } from "@/lib/utils";
import type { BranchInventoryItem } from "@/lib/types/branch";

const NEAR_EXPIRY_DAYS = 7;

interface StockRow {
  productId: string;
  name: string;
  quantity: number;
  unit: BranchInventoryItem["stock_unit"];
}

/** Total on hand per product — what the station has to work with. */
function aggregate(items: BranchInventoryItem[]): StockRow[] {
  const byProduct = new Map<string, StockRow>();
  for (const item of items) {
    const prev = byProduct.get(item.product_id);
    if (prev) prev.quantity += item.quantity;
    else
      byProduct.set(item.product_id, {
        productId: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        unit: item.stock_unit,
      });
  }
  return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function SubKitchenStockPage() {
  const inventory = useSubKitchenInventory();
  const nearExpiry = useSubKitchenNearExpiry({ within_days: NEAR_EXPIRY_DAYS });

  const rows = useMemo(() => aggregate(inventory.data ?? []), [inventory.data]);
  const expiring = nearExpiry.data ?? [];

  return (
    <div className="space-y-6">
      {expiring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <TriangleAlert className="size-4" aria-hidden />
              Near expiry
            </CardTitle>
            <CardDescription>
              Stock expiring within {NEAR_EXPIRY_DAYS} days — use it first.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiring.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-content">{item.product_name}</TableCell>
                    <TableCell className="text-right tabular-nums text-content">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-muted">
                      {stockUnitColumnLabel(item.stock_unit)}
                    </TableCell>
                    <TableCell className="font-medium text-warning">
                      {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Stock on hand</CardTitle>
          <CardDescription>What this branch has for the station to prep with.</CardDescription>
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
            emptyTitle="No stock yet"
            emptyDescription="Stock allocated to this branch will appear here."
          >
            {(stockRows) => (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockRows.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium text-content">{row.name}</TableCell>
                      <TableCell className="text-right">
                        {row.quantity === 0 ? (
                          <span className="text-faint">Out</span>
                        ) : (
                          <span className="tabular-nums text-content">{row.quantity}</span>
                        )}
                      </TableCell>
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
