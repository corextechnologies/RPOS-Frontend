"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
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
}: InventoryTableProps) {
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
          <EmptyState
            title="No stock on hand"
            description="Items will appear here once stock is received into your warehouse."
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-content">{item.product.name}</p>
                </TableCell>
                <TableCell className="text-muted">{item.product.sku || "—"}</TableCell>
                <TableCell>
                  {item.batch_code ? (
                    <span className="text-muted">{item.batch_code}</span>
                  ) : (
                    <Badge variant="secondary">Unbatched</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted">{item.expiry_date || "—"}</TableCell>
                <TableCell className="text-right font-medium text-content">
                  {item.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
