"use client";

import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { matchesStockSearch } from "@/lib/inventory-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";

interface KitchenInventoryTableProps {
  items?: KitchenInventoryItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onWaste?: (item: KitchenInventoryItem) => void;
  /** Filters by product name, SKU, or batch code. Owned by the page. */
  search?: string;
}

/**
 * On-hand stock for the caller's kitchen.
 *
 * There is deliberately no price column: `KitchenInventoryItem` carries no cost
 * price, so one cannot be rendered here by accident.
 *
 * Rows are keyed on `id`, not `product_id` — the same product appears once per
 * batch, so keying on the product would collapse real rows.
 */
export function KitchenInventoryTable({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No stock on hand",
  emptyDescription = "Items appear here once stock is received into your kitchen.",
  onWaste,
  search = "",
}: KitchenInventoryTableProps) {
  const filtered = useMemo(
    () => (items ?? []).filter((item) => matchesStockSearch(item, search)),
    [items, search],
  );
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState description="Failed to load inventory." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </CardContent>
      </Card>
    );
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No matches"
            description="No stock matches your search."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              {onWaste && <TableHead className="w-[120px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-content">{item.product.name}</p>
                </TableCell>
                <TableCell className="text-muted">{item.product.sku || "-"}</TableCell>
                <TableCell>
                  {item.batch_code ? (
                    <span className="text-muted">{item.batch_code}</span>
                  ) : (
                    // Never an empty cell — that reads as broken rather than as
                    // "this stock has no batch".
                    <Badge variant="secondary">No batch</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted">{item.expiry_date || "-"}</TableCell>
                <TableCell className="text-right font-medium text-content">
                  {item.quantity}
                </TableCell>
                {onWaste && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => onWaste(item)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Waste
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
