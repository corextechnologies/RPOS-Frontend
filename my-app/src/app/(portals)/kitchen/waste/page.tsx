"use client";

import { useMemo, useState } from "react";
import { KitchenInventoryTable } from "@/components/kitchen/inventory/KitchenInventoryTable";
import { KitchenWasteDialog } from "@/components/kitchen/inventory/KitchenWasteDialog";
import { KitchenNearExpiryList } from "@/components/kitchen/waste/KitchenNearExpiryList";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { WasteEventsTable } from "@/components/waste/WasteEventsTable";
import { WasteEventDetailDialog } from "@/components/waste/WasteEventDetailDialog";
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
  useKitchenWasteEvents,
  useWasteKitchenStock,
} from "@/lib/hooks/use-kitchen-inventory";
import type { KitchenWasteForm } from "@/lib/schemas/kitchen-stock";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import type { WasteEvent } from "@/lib/types/waste";

const WINDOW_OPTIONS = [3, 7, 14, 30];

export default function KitchenWastePage() {
  const [withinDays, setWithinDays] = useState(KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS);
  const [wasting, setWasting] = useState<KitchenInventoryItem | null>(null);
  const [wasteSearch, setWasteSearch] = useState("");
  const [viewingWaste, setViewingWaste] = useState<WasteEvent | null>(null);
  // Opening from the expiry list means the reason is almost always "expired".
  const [defaultMovementType, setDefaultMovementType] =
    useState<KitchenWasteForm["movement_type"]>("WASTE");

  const nearExpiry = useKitchenNearExpiry(withinDays);
  const inventory = useKitchenInventory();
  const wasteEvents = useKitchenWasteEvents();
  const wasteStock = useWasteKitchenStock();

  // Split on-hand stock by what the item is: goods the kitchen makes, resale
  // goods that pass through from the warehouse, and the raw materials consumed
  // to make the kitchen's items. Legacy rows without a kind are grouped under
  // "Other" so no stock is ever hidden.
  const stockGroups = useMemo(() => {
    const all = inventory.data ?? [];
    return {
      kitchen: all.filter((i) => i.product.kind === "FINISHED_GOOD"),
      resale: all.filter((i) => i.product.kind === "RESALE"),
      raw: all.filter((i) => i.product.kind === "RAW_MATERIAL"),
      other: all.filter((i) => i.product.kind == null),
    };
  }, [inventory.data]);

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
            <WasteEventsTable
            title="Waste & expired"
            description="Everything written off from your kitchen."
            searchPlaceholder="Search name, SKU, or batch…"
            searchValue={wasteSearch}
            onSearchChange={setWasteSearch}
            items={wasteEvents.data}
            isLoading={wasteEvents.isLoading}
            isError={wasteEvents.isError}
            onRetry={() => wasteEvents.refetch()}
            onSelect={setViewingWaste}
            />
          </div>
          <div className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                Kitchen items
              </h2>
              <p className="text-sm text-muted">Finished goods your kitchen produces.</p>
            </div>
            <KitchenInventoryTable
              items={stockGroups.kitchen}
              isLoading={inventory.isLoading}
              isError={inventory.isError}
              onRetry={() => inventory.refetch()}
              onWaste={(item) => openWasteDialog(item, "WASTE")}
              emptyTitle="No kitchen items on hand"
              emptyDescription="Items your kitchen produces appear here once made."
            />
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                For resale
              </h2>
              <p className="text-sm text-muted">
                Resale goods received from the warehouse.
              </p>
            </div>
            <KitchenInventoryTable
              items={stockGroups.resale}
              isLoading={inventory.isLoading}
              isError={inventory.isError}
              onRetry={() => inventory.refetch()}
              onWaste={(item) => openWasteDialog(item, "WASTE")}
              emptyTitle="No resale stock on hand"
              emptyDescription="Resale goods from the warehouse appear here once received."
            />
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                Raw materials
              </h2>
              <p className="text-sm text-muted">
                Ingredients from the warehouse used to make your kitchen items.
              </p>
            </div>
            <KitchenInventoryTable
              items={stockGroups.raw}
              isLoading={inventory.isLoading}
              isError={inventory.isError}
              onRetry={() => inventory.refetch()}
              onWaste={(item) => openWasteDialog(item, "WASTE")}
              emptyTitle="No raw materials on hand"
              emptyDescription="Ingredients from the warehouse appear here once received."
            />
          </div>

          {stockGroups.other.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-content">
                  Other
                </h2>
                <p className="text-sm text-muted">Stock with no category set.</p>
              </div>
              <KitchenInventoryTable
                items={stockGroups.other}
                isLoading={inventory.isLoading}
                isError={inventory.isError}
                onRetry={() => inventory.refetch()}
                onWaste={(item) => openWasteDialog(item, "WASTE")}
              />
            </div>
          )}
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
