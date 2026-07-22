"use client";

import { useState } from "react";
import { AdjustStockDialog } from "@/components/warehouse/inventory/AdjustStockDialog";
import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { EditProductDialog } from "@/components/warehouse/products/EditProductDialog";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { useAuth } from "@/lib/auth";
import {
  useAdjustWarehouseStock,
  useWarehouseInventory,
} from "@/lib/hooks/use-warehouse-inventory";
import { useUpdateWarehouseProduct } from "@/lib/hooks/use-warehouse-products";
import type {
  AdjustStockForm,
  UpdateWarehouseProductForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseInventoryPage() {
  const { can } = useAuth();
  const inventory = useWarehouseInventory();
  const adjustStock = useAdjustWarehouseStock();
  const updateProduct = useUpdateWarehouseProduct();
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

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

  const handleEdit = async (values: UpdateWarehouseProductForm) => {
    if (!editing) return;
    // Only catalog fields — quantity is never part of this payload.
    await updateProduct.mutateAsync({
      productId: editing.product_id,
      body: { name: values.name, sku: values.sku ?? "", kind: values.kind },
    });
    setEditing(null);
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
          onEdit={can("stock:receive") ? setEditing : undefined}
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

      <EditProductDialog
        item={editing}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSubmit={handleEdit}
        isSubmitting={updateProduct.isPending}
      />
    </div>
  );
}
