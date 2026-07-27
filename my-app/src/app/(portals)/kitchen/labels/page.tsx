"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  useKitchenLabels,
  useKitchenProductOptions,
} from "@/lib/hooks/use-kitchen-inventory";
import { useKitchenCatalogue } from "@/lib/hooks/use-kitchen-recipes";
import { printKitchenLabels } from "@/lib/kitchen/print-labels";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

const ALL_PRODUCTS = "all";

export default function KitchenLabelsPage() {
  const [productId, setProductId] = useState(ALL_PRODUCTS);
  const [batchCode, setBatchCode] = useState("");
  // Committed on submit rather than per keystroke: each change is a request, and
  // a half-typed batch code matches nothing.
  const [appliedBatch, setAppliedBatch] = useState("");

  const filters = {
    product_id: productId === ALL_PRODUCTS ? undefined : productId,
    batch_code: appliedBatch || undefined,
  };
  const labels = useKitchenLabels(filters);
  const { products } = useKitchenProductOptions();
  // The kitchen catalogue is the authoritative list of finished goods the kitchen
  // makes; labels carry no `kind`, so we filter against these ids to keep raw
  // materials (flour, chicken…) out of the sticker list.
  const catalogue = useKitchenCatalogue();

  const finishedGoodIds = useMemo(
    () => new Set((catalogue.data ?? []).map((p) => p.id)),
    [catalogue.data],
  );

  const unassigned = isMissingKitchenAssignment(labels.error);
  // Only finished goods get labels — exclude any raw-material stock rows.
  const rows = useMemo(
    () => (labels.data ?? []).filter((l) => finishedGoodIds.has(l.product_id)),
    [labels.data, finishedGoodIds],
  );
  // Restrict the product filter to finished goods too, so the picker never lists
  // a raw material that would only ever yield an empty result.
  const productOptions = useMemo(
    () => products.filter((p) => finishedGoodIds.has(p.id)),
    [products, finishedGoodIds],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Labels
          </h1>
          <p className="mt-1 text-sm text-muted">
            Expiry stickers for finished goods the kitchen makes. Raw materials and
            empty batches are left out.
          </p>
        </div>
        {!unassigned && (
          <Button
            onClick={() => printKitchenLabels(rows)}
            disabled={rows.length === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print {rows.length > 0 ? `${rows.length} ` : ""}
            {rows.length === 1 ? "label" : "labels"}
          </Button>
        )}
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <>
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="label-product">Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger id="label-product">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_PRODUCTS}>All products</SelectItem>
                    {productOptions.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="label-batch">Batch code</Label>
                <Input
                  id="label-batch"
                  value={batchCode}
                  placeholder="Any batch"
                  onChange={(e) => setBatchCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAppliedBatch(batchCode.trim());
                  }}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setAppliedBatch(batchCode.trim())}
              >
                Apply
              </Button>
            </CardContent>
          </Card>

          {labels.isLoading || catalogue.isLoading ? (
            <Card>
              <CardContent className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : labels.isError ? (
            <Card>
              <CardContent className="p-0">
                <ErrorState
                  description="Failed to load labels."
                  onRetry={() => labels.refetch()}
                />
              </CardContent>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="p-0">
                <EmptyState
                  title="No labels to print"
                  // A batch that matches nothing is an empty list, not an error.
                  description={
                    appliedBatch
                      ? `No finished goods on hand match batch "${appliedBatch}".`
                      : "Labels appear here for finished goods the kitchen has made and still holds."
                  }
                />
              </CardContent>
            </Card>
          ) : (
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
                    {rows.map((label) => (
                      <TableRow key={`${label.product_id}-${label.batch_code}`}>
                        <TableCell className="font-medium text-content">
                          {label.product_name}
                        </TableCell>
                        <TableCell className="text-muted">
                          {label.sku || "-"}
                        </TableCell>
                        <TableCell>
                          {label.batch_code ? (
                            <span className="text-muted">{label.batch_code}</span>
                          ) : (
                            <Badge variant="secondary">No batch</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted">
                          {label.expiry_date || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium text-content">
                          {label.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
