"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdjustStockInput,
  ReceiveStockInput,
  WasteStockInput,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { useWarehouseProducts } from "./use-warehouse-products";
import { toast } from "sonner";
import { stockAwareMessage } from "@/lib/api/errors";

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
 * Products selectable for stock intake and purchase orders.
 *
 * Reads the real catalog (`GET /warehouse/products`) rather than deriving the
 * list from inventory rows. Deriving it meant a product that had never been
 * stocked could not be chosen — and since choosing it is how you stock it, a new
 * product could never enter the warehouse at all. The catalog broke that cycle
 * in Phase 4.1.
 *
 * `/admin/products/pricing` is Admin-only and carries cost price, so it must
 * still never be called from here.
 */
export function useWarehouseProductOptions() {
  const catalog = useWarehouseProducts();

  const products = useMemo(
    () =>
      [...(catalog.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [catalog.data],
  );

  return {
    products,
    isLoading: catalog.isLoading,
    isError: catalog.isError,
    error: catalog.error,
  };
}

/**
 * True when total on hand across every batch has fallen to the limit.
 *
 * Low stock is computed client-side on purpose: there is no low-stock endpoint
 * or flag, and the notification fires only once per crossing — deliberately, so
 * people do not learn to ignore it. A persistent badge therefore has to be
 * derived here.
 *
 * Totals span batches: 5 units left in an old batch alongside 500 in a new one
 * is not low. Never compute this per inventory row.
 */
export function isLowStock(
  totalOnHand: number,
  reorderLevel: number | null | undefined,
): boolean {
  if (reorderLevel == null) return false;
  return totalOnHand <= reorderLevel;
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
    // Adjust/receive can shortfall against a specific batch; the message names
    // the batch when it does. See `stockAwareMessage`.
    onError: (err) => toast.error(stockAwareMessage(err, "Failed to receive stock")),
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
    onError: (err) => toast.error(stockAwareMessage(err, "Failed to adjust stock")),
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
    onError: (err) => toast.error(stockAwareMessage(err, "Failed to write off stock")),
  });
}
