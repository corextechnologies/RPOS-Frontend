"use client";

import { useMemo, useState } from "react";
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

  // Two shelves, not one: raw materials and resale goods are pulled in from the
  // warehouse, while finished goods are made here from recipes. Splitting them
  // keeps "what we bought" and "what we made" from reading as one pile.
  const { sourced, madeInHouse } = useMemo(() => {
    const items = inventory.data ?? [];
    return {
      sourced: items.filter((i) => i.product.kind !== "FINISHED_GOOD"),
      madeInHouse: items.filter((i) => i.product.kind === "FINISHED_GOOD"),
    };
  }, [inventory.data]);

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
      ) : inventory.isLoading || inventory.isError ? (
        // One shared skeleton/error state while the fetch settles — splitting
        // only makes sense once there is data to split.
        <KitchenInventoryTable
          items={inventory.data}
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          onRetry={() => inventory.refetch()}
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-content">
                Raw materials &amp; resale
              </h2>
              <p className="text-sm text-muted">
                Stock received from the warehouse.
              </p>
            </div>
            <KitchenInventoryTable
              items={sourced}
              isLoading={false}
              isError={false}
              onWaste={can("kitchen-stock:waste") ? setWasting : undefined}
              search={search}
              emptyTitle="No raw materials or resale stock"
              emptyDescription="Items appear here once stock is received from the warehouse."
            />
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-content">
                Made in-house
              </h2>
              <p className="text-sm text-muted">
                Finished goods your kitchen produced from recipes.
              </p>
            </div>
            <KitchenInventoryTable
              items={madeInHouse}
              isLoading={false}
              isError={false}
              onWaste={can("kitchen-stock:waste") ? setWasting : undefined}
              search={search}
              emptyTitle="No made-in-house stock"
              emptyDescription="Items appear here once you produce finished goods."
            />
          </section>
        </div>
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
