"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  InventoryProduct,
  ReceiveStockInput,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { toast } from "sonner";

export function useWarehouseInventory() {
  return useQuery({
    queryKey: queryKeys.warehouseInventory,
    queryFn: () => api.listWarehouseInventory(),
    // An unassigned manager stays unassigned until an Admin acts; retrying the
    // 409 just delays the empty state.
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

/**
 * Products selectable for stock intake, derived from what is already on hand.
 *
 * The Warehouse API exposes no product catalog, and `/admin/products/pricing`
 * is Admin-only and carries cost price, so it must not be called from here.
 * Consequence: a product never yet stocked in this warehouse cannot be chosen.
 * Swap this for a warehouse catalog endpoint once one exists — callers only
 * depend on the returned shape.
 */
export function useWarehouseProductOptions() {
  const inventory = useWarehouseInventory();

  const products = useMemo(() => {
    const byId = new Map<string, InventoryProduct>();
    for (const item of inventory.data ?? []) {
      if (!byId.has(item.product_id)) byId.set(item.product_id, item.product);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory.data]);

  return {
    products,
    isLoading: inventory.isLoading,
    isError: inventory.isError,
    error: inventory.error,
  };
}

export function useReceiveWarehouseStock() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: ReceiveStockInput) => api.receiveWarehouseStock(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseInventory });
      toast.success("Stock received");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to receive stock";
      toast.error(message);
    },
  });
}
