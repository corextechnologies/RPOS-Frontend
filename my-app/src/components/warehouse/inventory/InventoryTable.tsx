"use client";

import { useMemo } from "react";
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { matchesStockSearch } from "@/lib/inventory-search";
import {
  PRODUCT_KIND_LABEL,
  productKindBadgeVariant,
} from "@/lib/product-kind";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InventoryItem } from "@/lib/types/warehouse";

interface InventoryTableProps {
  items?: InventoryItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onAdjust?: (item: InventoryItem) => void;
  onWaste?: (item: InventoryItem) => void;
  onEdit?: (item: InventoryItem) => void;
  onEditExpiry?: (item: InventoryItem) => void;
  /** Filters by product name, SKU, or batch code. Owned by the page. */
  search?: string;
}

/**
 * On-hand stock for the caller's warehouse.
 * There is deliberately no price column: `InventoryItem` carries no cost price,
 * so one cannot be rendered here by accident.
 */
export function InventoryTable({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No stock on hand",
  emptyDescription = "Items will appear here once stock is received into your warehouse.",
  onAdjust,
  onWaste,
  onEdit,
  onEditExpiry,
  search = "",
}: InventoryTableProps) {
  const showActions = Boolean(onAdjust || onWaste || onEdit || onEditExpiry);
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
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                  {item.batch_code ? (
                    <span className="text-muted">{item.batch_code}</span>
                  ) : (
                    <Badge variant="secondary">Unbatched</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted">{item.expiry_date || "-"}</TableCell>
                <TableCell className="text-right font-medium text-content">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-muted">
                  {stockUnitColumnLabel(item.product.stock_unit)}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Actions">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit product
                          </DropdownMenuItem>
                        )}
                        {onEditExpiry && (
                          <DropdownMenuItem onClick={() => onEditExpiry(item)}>
                            <CalendarClock className="mr-2 h-4 w-4" /> Edit expiry
                            date
                          </DropdownMenuItem>
                        )}
                        {onAdjust && (
                          <DropdownMenuItem onClick={() => onAdjust(item)}>
                            <SlidersHorizontal className="mr-2 h-4 w-4" /> Adjust
                            quantity
                          </DropdownMenuItem>
                        )}
                        {onWaste && (
                          <DropdownMenuItem
                            className="text-danger"
                            onClick={() => onWaste(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Mark waste
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
