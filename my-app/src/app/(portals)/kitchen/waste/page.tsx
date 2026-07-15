"use client";

import { useState } from "react";
import { KitchenInventoryTable } from "@/components/kitchen/inventory/KitchenInventoryTable";
import { KitchenWasteDialog } from "@/components/kitchen/inventory/KitchenWasteDialog";
import { KitchenNearExpiryList } from "@/components/kitchen/waste/KitchenNearExpiryList";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS,
  useKitchenInventory,
  useKitchenNearExpiry,
  useWasteKitchenStock,
} from "@/lib/hooks/use-kitchen-inventory";
import type { KitchenWasteForm } from "@/lib/schemas/kitchen-stock";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

const WINDOW_OPTIONS = [3, 7, 14, 30];

export default function KitchenWastePage() {
  const [withinDays, setWithinDays] = useState(KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS);
  const [wasting, setWasting] = useState<KitchenInventoryItem | null>(null);
  // Opening from the expiry list means the reason is almost always "expired".
  const [defaultMovementType, setDefaultMovementType] =
    useState<KitchenWasteForm["movement_type"]>("WASTE");

  const nearExpiry = useKitchenNearExpiry(withinDays);
  const inventory = useKitchenInventory();
  const wasteStock = useWasteKitchenStock();

  const unassigned =
    isMissingKitchenAssignment(nearExpiry.error) ||
    isMissingKitchenAssignment(inventory.error);

  const openWasteDialog = (
    item: KitchenInventoryItem,
    movementType: KitchenWasteForm["movement_type"],
  ) => {
    setDefaultMovementType(movementType);
    setWasting(item);
  };

  const handleWaste = async (values: KitchenWasteForm) => {
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
        <KitchenUnassigned />
      ) : (
        <>
          <KitchenNearExpiryList
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
            <KitchenInventoryTable
              items={inventory.data}
              isLoading={inventory.isLoading}
              isError={inventory.isError}
              onRetry={() => inventory.refetch()}
              onWaste={(item) => openWasteDialog(item, "WASTE")}
            />
          </div>
        </>
      )}

      <KitchenWasteDialog
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
