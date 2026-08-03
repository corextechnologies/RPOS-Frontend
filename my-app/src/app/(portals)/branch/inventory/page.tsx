"use client";

import { useMemo, useState } from "react";
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
import { localDateOf, toLocalDateString } from "@/lib/date-range";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import type { WasteStockForm } from "@/lib/schemas/warehouse-stock";
import type { BranchInventoryItem } from "@/lib/types/branch";
import type { WasteEvent } from "@/lib/types/waste";

/**
 * A branch stock row as shown in the table: the backend's per-receipt lots
 * consolidated to product + expiry grain, with an `expired` flag computed once.
 */
interface BranchStockRow extends BranchInventoryItem {
  /** `expiry_date` is strictly before today (local calendar). */
  expired: boolean;
}

/**
 * Collapse the backend's raw lot rows into what the branch actually wants to
 * see: one row per product **and expiry date**, quantities summed. Two receipts
 * of the same product on the same day (e.g. a production-target dispatch and a
 * branch-request receipt) share an expiry and so merge into a single row.
 *
 * - **Batch is dropped** — the branch tracks finished goods by product, the
 *   column is gone, and write-off is logged product-level.
 * - **Out-of-stock rows are removed entirely** (summed quantity must be > 0).
 * - **Expired lots are kept** and flagged, so a manager can still write them off.
 *
 * This is a display-side stopgap; the durable fix is the backend consolidating
 * lots by product + expiry (see the note sent to the backend team).
 */
function groupBranchStock(items: BranchInventoryItem[]): BranchStockRow[] {
  const today = toLocalDateString(new Date());
  const byKey = new Map<string, BranchStockRow>();

  for (const item of items) {
    const key = `${item.product_id}|${item.expiry_date ?? ""}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }
    byKey.set(key, {
      ...item,
      id: key,
      batch_code: "",
      quantity: item.quantity,
      expired: item.expiry_date ? localDateOf(item.expiry_date) < today : false,
    });
  }

  return [...byKey.values()]
    .filter((row) => row.quantity > 0)
    .sort(
      (a, b) =>
        a.product_name.localeCompare(b.product_name) ||
        (a.expiry_date ?? "9999-12-31").localeCompare(b.expiry_date ?? "9999-12-31"),
    );
}

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

  const rows = useMemo(
    () => (data ? groupBranchStock(data) : undefined),
    [data],
  );

  const [wasting, setWasting] = useState<BranchStockRow | null>(null);
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
        data={rows}
        isEmpty={(list) => list.length === 0}
        errorTitle="Couldn't load inventory"
        errorDescription={error instanceof Error ? error.message : undefined}
        onRetry={() => void refetch()}
        emptyTitle="No stock yet"
        emptyDescription="Stock allocated to this branch will appear here."
      >
        {(list) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Expires</TableHead>
                  {canWaste && <TableHead className="w-[120px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span className="font-medium text-content">{item.product_name}</span>
                      {item.sku && (
                        <span className="ml-2 font-mono text-xs text-faint">{item.sku}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums text-content">{item.quantity}</span>
                    </TableCell>
                    <TableCell className="text-muted">
                      {stockUnitColumnLabel(item.stock_unit)}
                    </TableCell>
                    <TableCell className="text-muted">
                      <span className="inline-flex items-center gap-2">
                        {item.expiry_date ? formatDate(item.expiry_date) : "-"}
                        {item.expired && <Badge variant="destructive">Expired</Badge>}
                      </span>
                    </TableCell>
                    {canWaste && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
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
        defaultMovementType={wasting?.expired ? "EXPIRY" : "WASTE"}
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
