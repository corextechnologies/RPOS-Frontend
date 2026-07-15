"use client";

import { useState } from "react";
import { AdjustStockDialog } from "@/components/warehouse/inventory/AdjustStockDialog";
import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { useAuth } from "@/lib/auth";
import {
  useAdjustWarehouseStock,
  useWarehouseInventory,
} from "@/lib/hooks/use-warehouse-inventory";
import type { AdjustStockForm } from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseInventoryPage() {
  const { can } = useAuth();
  const inventory = useWarehouseInventory();
  const adjustStock = useAdjustWarehouseStock();
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);

  const unassigned = isMissingWarehouseAssignment(inventory.error);

  const handleAdjust = async (values: AdjustStockForm) => {
    if (!adjusting) return;
    await adjustStock.mutateAsync({
      product_id: adjusting.product_id,
      quantity_delta: Number(values.quantity_delta),
      batch_code: adjusting.batch_code || undefined,
      notes: values.notes || undefined,
    });
    setAdjusting(null);
  };

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
          onAdjust={can("stock:adjust") ? setAdjusting : undefined}
        />
      )}

      <AdjustStockDialog
        item={adjusting}
        open={!!adjusting}
        onOpenChange={(open) => {
          if (!open) setAdjusting(null);
        }}
        onSubmit={handleAdjust}
        isSubmitting={adjustStock.isPending}
      />
    </div>
  );
}
