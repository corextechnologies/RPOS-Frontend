"use client";

import { useState } from "react";
import { WasteStockDialog } from "@/components/warehouse/inventory/WasteStockDialog";
import { EditExpiryDialog } from "@/components/warehouse/inventory/EditExpiryDialog";
import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { NearExpiryList } from "@/components/warehouse/waste/NearExpiryList";
import { EditWasteEventDialog } from "@/components/warehouse/waste/EditWasteEventDialog";
import { WasteEventsTable } from "@/components/waste/WasteEventsTable";
import { WasteEventDetailDialog } from "@/components/waste/WasteEventDetailDialog";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  NEAR_EXPIRY_DEFAULT_DAYS,
  useNearExpiryInventory,
  useUpdateWarehouseStockExpiry,
  useUpdateWarehouseWasteEvent,
  useWarehouseInventory,
  useWarehouseWasteEvents,
  useWasteWarehouseStock,
} from "@/lib/hooks/use-warehouse-inventory";
import type {
  UpdateStockExpiryForm,
  WasteStockForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import type { WasteEvent } from "@/lib/types/waste";

const WINDOW_OPTIONS = [3, 7, 14, 30];

export default function WarehouseWastePage() {
  const { can } = useAuth();
  const [withinDays, setWithinDays] = useState(NEAR_EXPIRY_DEFAULT_DAYS);
  const [wasting, setWasting] = useState<InventoryItem | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<InventoryItem | null>(null);
  const [viewingWaste, setViewingWaste] = useState<WasteEvent | null>(null);
  const [editingWaste, setEditingWaste] = useState<WasteEvent | null>(null);
  const [wasteSearch, setWasteSearch] = useState("");
  // Opening from the expiry list means the reason is almost always "expired".
  const [defaultMovementType, setDefaultMovementType] =
    useState<WasteStockForm["movement_type"]>("WASTE");

  const nearExpiry = useNearExpiryInventory(withinDays);
  const inventory = useWarehouseInventory();
  const wasteEvents = useWarehouseWasteEvents();
  const wasteStock = useWasteWarehouseStock();
  const updateExpiry = useUpdateWarehouseStockExpiry();
  const updateWasteEvent = useUpdateWarehouseWasteEvent();

  const canWaste = can("stock:waste");

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
      // Optional on the wire, always sent: an unreasoned write-off cannot be
      // reported on later.
      waste_reason: values.waste_reason,
      movement_type: values.movement_type,
      batch_code: wasting.batch_code || undefined,
      notes: values.notes || undefined,
    });
    setWasting(null);
  };

  const handleEditExpiry = async (values: UpdateStockExpiryForm) => {
    if (!editingExpiry) return;
    await updateExpiry.mutateAsync({
      itemId: editingExpiry.id,
      // Blank clears the date; the API treats null as "no expiry".
      body: { expiry_date: values.expiry_date ? values.expiry_date : null },
    });
    setEditingExpiry(null);
  };

  const handleEditWaste = async (values: WasteStockForm) => {
    if (!editingWaste) return;
    await updateWasteEvent.mutateAsync({
      eventId: editingWaste.id,
      body: {
        quantity: Number(values.quantity),
        waste_reason: values.waste_reason,
        movement_type: values.movement_type,
        notes: values.notes || null,
      },
    });
    setEditingWaste(null);
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
            onEditExpiry={canWaste ? setEditingExpiry : undefined}
          />


         
          <div className="flex flex-col gap-3">
           
            <WasteEventsTable
              title="Waste & expired"
              description="Everything written off from your warehouse."
              searchPlaceholder="Search name, SKU, or batch…"
              searchValue={wasteSearch}
              onSearchChange={(value: string) => setWasteSearch(value)}
              items={wasteEvents.data}
              isLoading={wasteEvents.isLoading}
              isError={wasteEvents.isError}
              onRetry={() => wasteEvents.refetch()}
              onSelect={setViewingWaste}
              search={wasteSearch}
            />
          </div>

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
              onEditExpiry={canWaste ? setEditingExpiry : undefined}
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

      <EditExpiryDialog
        item={editingExpiry}
        open={!!editingExpiry}
        onOpenChange={(open) => {
          if (!open) setEditingExpiry(null);
        }}
        onSubmit={handleEditExpiry}
        isSubmitting={updateExpiry.isPending}
      />

      <WasteEventDetailDialog
        event={viewingWaste}
        open={!!viewingWaste}
        onOpenChange={(open) => {
          if (!open) setViewingWaste(null);
        }}
        onEdit={
          canWaste
            ? (event) => {
                // Hand off from the detail card straight into the editor.
                setViewingWaste(null);
                setEditingWaste(event);
              }
            : undefined
        }
      />

      <EditWasteEventDialog
        event={editingWaste}
        open={!!editingWaste}
        onOpenChange={(open) => {
          if (!open) setEditingWaste(null);
        }}
        onSubmit={handleEditWaste}
        isSubmitting={updateWasteEvent.isPending}
      />
    </div>
  );
}
