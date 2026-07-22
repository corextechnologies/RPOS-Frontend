"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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
import type { AdminInventoryItem } from "@/lib/types/admin";
import {
  PRODUCT_KIND_LABEL,
  productKindBadgeVariant,
} from "@/lib/product-kind";

interface AdminInventoryTableProps {
  items?: AdminInventoryItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  locationName?: (item: AdminInventoryItem) => string;
  /** Filters by product name, SKU, or batch code. Owned by the page. */
  search?: string;
}

/**
 * Stock across every location in the restaurant.
 *
 * This is the only table in the app allowed to render `cost_price` — Admin is
 * the sole role that may see it, and only `AdminInventoryItem` carries it.
 *
 * Rows are keyed on `id`, not `product_id` — the same product appears once per
 * batch, so keying on the product would collapse real rows.
 */
export function AdminInventoryTable({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No stock on hand",
  emptyDescription = "Stock appears here once it is received into a branch, kitchen, or warehouse.",
  locationName,
  search = "",
}: AdminInventoryTableProps) {
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
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Cost price</TableHead>
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
                  {item.product.kind ? (
                    <Badge variant={productKindBadgeVariant(item.product.kind)}>
                      {PRODUCT_KIND_LABEL[item.product.kind]}
                    </Badge>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.location_type}</Badge>
                  <p className="mt-1 text-xs text-muted">
                    {locationName ? locationName(item) : item.location_id}
                  </p>
                </TableCell>
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
                <TableCell className="text-right font-medium text-content">
                  {/* Rendered verbatim: it is a decimal money string, and parsing
                      it into a float would lose precision the backend keeps. */}
                  {item.product.cost_price ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
