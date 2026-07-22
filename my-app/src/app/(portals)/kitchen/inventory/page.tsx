"use client";

import { useState } from "react";
import { KitchenInventoryTable } from "@/components/kitchen/inventory/KitchenInventoryTable";
import { KitchenWasteDialog } from "@/components/kitchen/inventory/KitchenWasteDialog";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  useKitchenInventory,
  useWasteKitchenStock,
} from "@/lib/hooks/use-kitchen-inventory";
import type { KitchenWasteForm } from "@/lib/schemas/kitchen-stock";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenInventoryPage() {
  const { can } = useAuth();
  const inventory = useKitchenInventory();
  const wasteStock = useWasteKitchenStock();
  const [wasting, setWasting] = useState<KitchenInventoryItem | null>(null);
  const [search, setSearch] = useState("");

  const unassigned = isMissingKitchenAssignment(inventory.error);

  const handleWaste = async (values: KitchenWasteForm) => {
    if (!wasting) return;
    await wasteStock.mutateAsync({
      product_id: wasting.product_id,
      quantity: Number(values.quantity),
      waste_reason: values.waste_reason,
      movement_type: values.movement_type,
      // An empty batch code means unbatched stock, and the API wants the key
      // omitted rather than sent blank.
      batch_code: wasting.batch_code || undefined,
      notes: values.notes || undefined,
    });
    setWasting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted">
            On-hand stock in your kitchen, one row per product and batch.
          </p>
        </div>
        {!unassigned && (
          <Input
            className="sm:w-80"
            placeholder="Search name, SKU, or batch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <KitchenInventoryTable
          items={inventory.data}
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          onRetry={() => inventory.refetch()}
          onWaste={can("kitchen-stock:waste") ? setWasting : undefined}
          search={search}
        />
      )}

      <KitchenWasteDialog
        item={wasting}
        open={!!wasting}
        onOpenChange={(open) => {
          if (!open) setWasting(null);
        }}
        onSubmit={handleWaste}
        isSubmitting={wasteStock.isPending}
      />
    </div>
  );
}
