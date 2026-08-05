"use client";

import { LineChart, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type { ProductKind, ProductPricing } from "@/lib/types/admin";
import { formatPlanAmount } from "@/lib/types/super-admin";

interface PricingTableProps {
  items?: ProductPricing[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  canEdit: boolean;
  onEdit: (product: ProductPricing) => void;
  /** Opens the Phase 7 forecast setup (event tags + expected daily). Sellable only. */
  onForecast?: (product: ProductPricing) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const KIND_LABEL: Record<ProductKind, string> = {
  RAW_MATERIAL: "raw",
  FINISHED_GOOD: "made",
  RESALE: "resale",
};

function KindBadge({ kind }: { kind: ProductKind }) {
  return (
    <Badge variant={kind === "RAW_MATERIAL" ? "outline" : "secondary"} className="shrink-0">
      {KIND_LABEL[kind] ?? kind.toLowerCase()}
    </Badge>
  );
}

export function PricingTable({
  items,
  isLoading,
  isError,
  onRetry,
  canEdit,
  onEdit,
  onForecast,
  emptyTitle = "No products yet",
  emptyDescription = "Products will appear here once they exist for your restaurant.",
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
          <EmptyState title={emptyTitle} description={emptyDescription} />
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
              <TableHead>Category</TableHead>
              <TableHead>Selling price</TableHead>
              <TableHead>Cost price</TableHead>
              {canEdit && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-content">{product.name}</p>
                    {/* Unavailable is a catalogue-wide switch, distinct from
                        a branch 86-ing something for the night. */}
                    <KindBadge kind={product.kind} />
                    {product.is_sellable && !product.is_available && (
                      <Badge variant="outline">Unavailable</Badge>
                    )}
                  </div>
                  {product.sku && (
                    <p className="font-mono text-xs text-faint">{product.sku}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted">{product.category || "-"}</TableCell>
                <TableCell>
                  {/*
                    A raw material is not "unpriced" — it is unsellable. Showing
                    "Not priced" here would imply someone forgot, and send an
                    admin hunting for a field that does not exist for flour.
                  */}
                  {!product.is_sellable ? (
                    <span className="text-faint">—</span>
                  ) : product.selling_price == null ? (
                    // Not cosmetic: an unpriced sellable product can't be sold
                    // at all — the server answers 409 `product_not_priced`.
                    <Badge variant="warning">Not priced</Badge>
                  ) : (
                    <span className="tabular-nums text-content">
                      {formatPlanAmount(product.selling_price)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums text-muted">
                  {product.cost_price == null ? "-" : formatPlanAmount(product.cost_price)}
                </TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onForecast && product.is_sellable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Forecast setup for ${product.name}`}
                          title="Forecast setup — event tags & expected daily sales"
                          onClick={() => onForecast(product)}
                        >
                          <LineChart className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit pricing for ${product.name}`}
                        onClick={() => onEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
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
