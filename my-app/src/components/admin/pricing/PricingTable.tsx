"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { ProductPricing } from "@/lib/types/admin";
import { formatPlanAmount } from "@/lib/types/super-admin";

interface PricingTableProps {
  items?: ProductPricing[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  canEdit: boolean;
  onEdit: (product: ProductPricing) => void;
}

export function PricingTable({
  items,
  isLoading,
  isError,
  onRetry,
  canEdit,
  onEdit,
}: PricingTableProps) {
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
          <ErrorState description="Failed to load product pricing." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No products yet"
            description="Products will appear here once they exist for your restaurant."
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
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Cost price</TableHead>
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <p className="font-medium text-content">{product.name}</p>
                </TableCell>
                <TableCell className="text-muted">{product.sku || "—"}</TableCell>
                <TableCell className="text-muted">
                  {product.cost_price == null ? "—" : formatPlanAmount(product.cost_price)}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit cost for ${product.name}`}
                      onClick={() => onEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
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
