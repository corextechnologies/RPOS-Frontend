"use client";

import { useState } from "react";
import { AdjustStockDialog } from "@/components/warehouse/inventory/AdjustStockDialog";
import { EditExpiryDialog } from "@/components/warehouse/inventory/EditExpiryDialog";
import { InventoryTable } from "@/components/warehouse/inventory/InventoryTable";
import { EditProductDialog } from "@/components/warehouse/products/EditProductDialog";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  useAdjustWarehouseStock,
  useUpdateWarehouseStockExpiry,
  useWarehouseInventory,
} from "@/lib/hooks/use-warehouse-inventory";
import { useUpdateWarehouseProduct } from "@/lib/hooks/use-warehouse-products";
import type {
  AdjustStockForm,
  UpdateStockExpiryForm,
  UpdateWarehouseProductForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseInventoryPage() {
  const { can } = useAuth();
  const inventory = useWarehouseInventory();
  const adjustStock = useAdjustWarehouseStock();
  const updateProduct = useUpdateWarehouseProduct();
  const updateExpiry = useUpdateWarehouseStockExpiry();
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [editingExpiry, setEditingExpiry] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState("");

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
      body: {
        name: values.name,
        sku: values.sku ?? "",
        kind: values.kind,
        stock_unit: values.stock_unit,
      },
    });
    setEditing(null);
  };

  const handleEditExpiry = async (values: UpdateStockExpiryForm) => {
    if (!editingExpiry) return;
    await updateExpiry.mutateAsync({
      itemId: editingExpiry.id,
      body: { expiry_date: values.expiry_date ? values.expiry_date : null },
    });
    setEditingExpiry(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-muted">
            On-hand stock in your warehouse.
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
        <WarehouseUnassigned />
      ) : (
        <InventoryTable
          items={inventory.data}
          isLoading={inventory.isLoading}
          isError={inventory.isError}
          onRetry={() => inventory.refetch()}
          onAdjust={can("stock:adjust") ? setAdjusting : undefined}
          onEdit={can("stock:receive") ? setEditing : undefined}
          onEditExpiry={can("stock:waste") ? setEditingExpiry : undefined}
          search={search}
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
        product={
          editing
            ? {
                id: editing.product_id,
                name: editing.product.name,
                sku: editing.product.sku,
                kind: editing.product.kind,
                // Seed the real unit, or the dialog defaults it to EACH and a
                // save with the unit untouched silently overwrites it.
                stock_unit: editing.product.stock_unit,
              }
            : null
        }
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSubmit={handleEdit}
        isSubmitting={updateProduct.isPending}
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
    </div>
  );
}
