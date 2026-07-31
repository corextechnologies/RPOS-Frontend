"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { BranchWasteDialog } from "@/components/branch/BranchWasteDialog";
import { WasteEventsTable } from "@/components/waste/WasteEventsTable";
import { WasteEventDetailDialog } from "@/components/waste/WasteEventDetailDialog";
import { useAuth } from "@/lib/auth";
import {
  useLogSubKitchenWaste,
  useSubKitchenInventory,
  useSubKitchenWasteEvents,
} from "@/lib/hooks/use-sub-kitchen";
import { stockUnitColumnLabel } from "@/lib/stock-unit";
import { formatDate } from "@/lib/utils";
import type { WasteStockForm } from "@/lib/schemas/warehouse-stock";
import type { BranchInventoryItem } from "@/lib/types/branch";
import type { WasteEvent } from "@/lib/types/waste";

const EXPIRY_SOON_DAYS = 7;

/** Expired or expiring within the window — opens the dialog pre-set to EXPIRY. */
function isExpiring(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr).getTime();
  if (Number.isNaN(due)) return false;
  return due <= Date.now() + EXPIRY_SOON_DAYS * 86_400_000;
}

export default function SubKitchenWastePage() {
  const { hasCapability } = useAuth();
  // Station waste is gated on PREP_OPERATE — not WASTE_LOG, and not the manager
  // role. The chef holds it, and so does the manager covering the station.
  const canWaste = hasCapability("PREP_OPERATE");

  const inventory = useSubKitchenInventory();
  // The history endpoint carries the same gate; don't fetch it without it.
  const wasteEvents = useSubKitchenWasteEvents(undefined, { enabled: canWaste });
  const logWaste = useLogSubKitchenWaste();

  const [wasting, setWasting] = useState<BranchInventoryItem | null>(null);
  const [expiryDefault, setExpiryDefault] = useState(false);
  const [wasteSearch, setWasteSearch] = useState("");
  const [viewingWaste, setViewingWaste] = useState<WasteEvent | null>(null);

  const openWaste = (item: BranchInventoryItem) => {
    setExpiryDefault(isExpiring(item.expiry_date));
    setWasting(item);
  };

  const handleWaste = async (values: WasteStockForm) => {
    if (!wasting) return;
    await logWaste.mutateAsync({
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
      <Card>
        <CardHeader>
          <CardTitle>Write off stock</CardTitle>
          <CardDescription>
            Remove spoiled or expired stock from the station&apos;s shelves. Each write-off is
            logged below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <PageState
            isLoading={inventory.isLoading}
            isError={inventory.isError}
            data={inventory.data}
            isEmpty={(rows) => rows.length === 0}
            errorTitle="Couldn't load stock"
            errorDescription={
              inventory.error instanceof Error ? inventory.error.message : undefined
            }
            onRetry={() => inventory.refetch()}
            emptyTitle="No stock yet"
            emptyDescription="Stock allocated to this branch will appear here."
          >
            {(rows) => (
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
                        {item.batch_code || <Badge variant="secondary">Unbatched</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity === 0 ? (
                          <span className="text-faint">Out</span>
                        ) : (
                          <span className="tabular-nums text-content">{item.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted">
                        {stockUnitColumnLabel(item.stock_unit)}
                      </TableCell>
                      <TableCell
                        className={isExpiring(item.expiry_date) ? "font-medium text-warning" : "text-muted"}
                      >
                        {item.expiry_date ? formatDate(item.expiry_date) : "—"}
                      </TableCell>
                      {canWaste && (
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={item.quantity === 0}
                            onClick={() => openWaste(item)}
                          >
                            Write off
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PageState>
        </CardContent>
      </Card>

      {canWaste && (
        <WasteEventsTable
          title="Write-off history"
          description="Everything written off from the station."
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
        isSubmitting={logWaste.isPending}
        defaultMovementType={expiryDefault ? "EXPIRY" : "WASTE"}
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
