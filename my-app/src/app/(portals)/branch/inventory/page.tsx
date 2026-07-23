"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useBranchInventory,
  useBranchWasteEvents,
  useWasteBranchStock,
} from "@/lib/hooks/use-branch";
import { useAuth } from "@/lib/auth";
import { PageState } from "@/components/ui/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BranchWasteDialog } from "@/components/branch/BranchWasteDialog";
import { WasteEventsTable } from "@/components/waste/WasteEventsTable";
import { WasteEventDetailDialog } from "@/components/waste/WasteEventDetailDialog";
import { formatDate } from "@/lib/utils";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import type { WasteStockForm } from "@/lib/schemas/warehouse-stock";
import type { BranchInventoryItem } from "@/lib/types/branch";
import type { WasteEvent } from "@/lib/types/waste";

/**
 * Branch stock on hand, plus write-off of wasted/expired stock and its history.
 *
 * Inventory is readable by BRANCH_STAFF; writing off is a manager action gated
 * on `branch-waste:log`. There is **no price column** and there must never be
 * one: cost is Admin-only and is absent from `BranchInventoryItem`
 * structurally, not hidden with CSS.
 */
export default function BranchInventoryPage() {
  const { can } = useAuth();
  const canWaste = can("branch-waste:log");
  const { data, isLoading, error, refetch } = useBranchInventory();
  // History is manager-only server-side; don't fetch it for non-managers.
  const wasteEvents = useBranchWasteEvents(undefined, { enabled: canWaste });
  const wasteStock = useWasteBranchStock();

  const [wasting, setWasting] = useState<BranchInventoryItem | null>(null);
  const [wasteSearch, setWasteSearch] = useState("");
  const [viewingWaste, setViewingWaste] = useState<WasteEvent | null>(null);

  const handleWaste = async (values: WasteStockForm) => {
    if (!wasting) return;
    await wasteStock.mutateAsync({
      product_id: wasting.product_id,
      quantity: Number(values.quantity),
      waste_reason: values.waste_reason,
      movement_type: values.movement_type,
      batch_code: wasting.batch_code || undefined,
      notes: values.notes || undefined,
    });
    setWasting(null);
  };

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
                  <TableHead>Unit</TableHead>
                  <TableHead>Expires</TableHead>
                  {canWaste && <TableHead className="w-[120px]" />}
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
                        <span className="tabular-nums text-content">
                          {item.quantity}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted">
                      {stockUnitColumnLabel(item.stock_unit)}
                    </TableCell>
                    <TableCell className="text-muted">
                      {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                    </TableCell>
                    {canWaste && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          disabled={item.quantity === 0}
                          onClick={() => setWasting(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Waste
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>

      {/* Manager-only, mirroring the server-side gate on the history endpoint. */}
      {canWaste && (
        <WasteEventsTable
          title="Waste & expired"
          description="Everything written off from this branch."
          searchPlaceholder="Search name, SKU, or batch…"
          searchValue={wasteSearch}
          onSearchChange={setWasteSearch}
          items={wasteEvents.data}
          isLoading={wasteEvents.isLoading}
          isError={wasteEvents.isError}
          onRetry={() => wasteEvents.refetch()}
          onSelect={setViewingWaste}
        />
      )}

      <BranchWasteDialog
        item={wasting}
        open={!!wasting}
        onOpenChange={(open) => {
          if (!open) setWasting(null);
        }}
        onSubmit={handleWaste}
        isSubmitting={wasteStock.isPending}
      />

      <WasteEventDetailDialog
        event={viewingWaste}
        open={!!viewingWaste}
        onOpenChange={(open) => {
          if (!open) setViewingWaste(null);
        }}
      />
    </div>
  );
}
