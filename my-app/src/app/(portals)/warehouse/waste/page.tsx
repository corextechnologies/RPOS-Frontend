"use client";

import { useState } from "react";
import { WasteStockDialog } from "@/components/warehouse/inventory/WasteStockDialog";
import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { NearExpiryList } from "@/components/warehouse/waste/NearExpiryList";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NEAR_EXPIRY_DEFAULT_DAYS,
  useNearExpiryInventory,
  useWarehouseInventory,
  useWasteWarehouseStock,
} from "@/lib/hooks/use-warehouse-inventory";
import type { WasteStockForm } from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

const WINDOW_OPTIONS = [3, 7, 14, 30];

export default function WarehouseWastePage() {
  const [withinDays, setWithinDays] = useState(NEAR_EXPIRY_DEFAULT_DAYS);
  const [wasting, setWasting] = useState<InventoryItem | null>(null);
  // Opening from the expiry list means the reason is almost always "expired".
  const [defaultMovementType, setDefaultMovementType] =
    useState<WasteStockForm["movement_type"]>("WASTE");

  const nearExpiry = useNearExpiryInventory(withinDays);
  const inventory = useWarehouseInventory();
  const wasteStock = useWasteWarehouseStock();

  const unassigned =
    isMissingWarehouseAssignment(nearExpiry.error) ||
    isMissingWarehouseAssignment(inventory.error);

  const openWasteDialog = (
    item: InventoryItem,
    movementType: WasteStockForm["movement_type"],
  ) => {
    setDefaultMovementType(movementType);
    setWasting(item);
  };

  const handleWaste = async (values: WasteStockForm) => {
    if (!wasting) return;
    await wasteStock.mutateAsync({
      product_id: wasting.product_id,
      quantity: Number(values.quantity),
      movement_type: values.movement_type,
      batch_code: wasting.batch_code || undefined,
      notes: values.notes || undefined,
    });
    setWasting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Waste & expiry
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track expiring stock and write off waste.
          </p>
        </div>
        {!unassigned && (
          <Select
            value={String(withinDays)}
            onValueChange={(value) => setWithinDays(Number(value))}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  Next {days} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <>
          <NearExpiryList
            items={nearExpiry.data}
            withinDays={withinDays}
            isLoading={nearExpiry.isLoading}
            isError={nearExpiry.isError}
            onRetry={() => nearExpiry.refetch()}
            onWaste={(item) => openWasteDialog(item, "EXPIRY")}
          />

          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-content">
              All stock
            </h2>
            <InventoryTable
              items={inventory.data}
              isLoading={inventory.isLoading}
              isError={inventory.isError}
              onRetry={() => inventory.refetch()}
              emptyDescription="Items will appear here once stock is received into your warehouse."
              onWaste={(item) => openWasteDialog(item, "WASTE")}
            />
          </div>
        </>
      )}

      <WasteStockDialog
        item={wasting}
        open={!!wasting}
        onOpenChange={(open) => {
          if (!open) setWasting(null);
        }}
        onSubmit={handleWaste}
        isSubmitting={wasteStock.isPending}
        defaultMovementType={defaultMovementType}
      />
    </div>
  );
}
