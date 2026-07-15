"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdjustStockInput,
  InventoryProduct,
  ReceiveStockInput,
  WasteStockInput,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { toast } from "sonner";

/** Default matches the API's own `within_days` default. */
export const NEAR_EXPIRY_DEFAULT_DAYS = 7;

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

export function useNearExpiryInventory(withinDays: number) {
  return useQuery({
    queryKey: queryKeys.warehouseNearExpiry(withinDays),
    queryFn: () => api.listNearExpiryInventory({ within_days: withinDays }),
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

/**
 * Any stock movement can change both the on-hand list and which items are near
 * expiry, so both are refreshed together.
 */
function useStockMovementInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.warehouseInventory });
    qc.invalidateQueries({ queryKey: ["warehouse-near-expiry"] });
  };
}

export function useReceiveWarehouseStock() {
  const invalidate = useStockMovementInvalidation();

  return useMutation({
    mutationFn: (body: ReceiveStockInput) => api.receiveWarehouseStock(body),
    onSuccess: () => {
      invalidate();
      toast.success("Stock received");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to receive stock";
      toast.error(message);
    },
  });
}

export function useAdjustWarehouseStock() {
  const invalidate = useStockMovementInvalidation();

  return useMutation({
    mutationFn: (body: AdjustStockInput) => api.adjustWarehouseStock(body),
    onSuccess: () => {
      invalidate();
      toast.success("Stock adjusted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to adjust stock";
      toast.error(message);
    },
  });
}

export function useWasteWarehouseStock() {
  const invalidate = useStockMovementInvalidation();

  return useMutation({
    mutationFn: (body: WasteStockInput) => api.wasteWarehouseStock(body),
    onSuccess: () => {
      invalidate();
      toast.success("Stock written off");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to write off stock";
      toast.error(message);
    },
  });
}
