"use client";

import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { useWarehouseInventory } from "@/lib/hooks/use-warehouse-inventory";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseInventoryPage() {
  const inventory = useWarehouseInventory();
  const unassigned = isMissingWarehouseAssignment(inventory.error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-muted">
          On-hand stock in your warehouse.
        </p>
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <InventoryTable
          items={inventory.data}
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          onRetry={() => inventory.refetch()}
        />
      )}
    </div>
  );
}
