"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  KitchenLabelFilters,
  KitchenProduct,
  KitchenWasteInput,
} from "@/lib/types/kitchen";
import {
  isInsufficientStock,
  isMissingKitchenAssignment,
  isNoSuchStock,
} from "@/lib/types/kitchen";
import type { WasteEventFilters } from "@/lib/types/waste";
import { toast } from "sonner";
import { stockAwareMessage } from "@/lib/api/errors";

/** Default matches the API's own `within_days` default. */
export const KITCHEN_NEAR_EXPIRY_DEFAULT_DAYS = 7;

export function useKitchenInventory() {
  return useQuery({
    queryKey: queryKeys.kitchenInventory,
    queryFn: () => api.listKitchenInventory(),
    // An unassigned user stays unassigned until an Admin acts; retrying the 409
    // just delays the empty state.
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useKitchenNearExpiry(withinDays: number) {
  return useQuery({
    queryKey: queryKeys.kitchenNearExpiry(withinDays),
    queryFn: () => api.listKitchenNearExpiry({ within_days: withinDays }),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

/** The kitchen's own write-off history (waste + expiry). */
export function useKitchenWasteEvents(filters?: WasteEventFilters) {
  return useQuery({
    queryKey: queryKeys.kitchenWaste(filters),
    queryFn: () => api.listKitchenWasteEvents(filters),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useKitchenLabels(filters?: KitchenLabelFilters) {
  return useQuery({
    queryKey: queryKeys.kitchenLabels(filters),
    queryFn: () => api.listKitchenLabels(filters),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

/**
 * Products selectable in kitchen forms, derived from what is already on hand.
 *
 * This is the intended approach, not a stopgap: there is no product-catalog
 * endpoint, and the contract says to build pickers from the `product` object
 * embedded in inventory rows. `/admin/products/pricing` is Admin-only and
 * carries cost price, so it must never be called from here.
 *
 * KNOWN LIMIT: a product this kitchen has never stocked cannot be chosen — which
 * on the request-stock form means a genuinely new product can never make its
 * first trip into the kitchen. Zero-quantity rows survive a write-off, so only
 * never-stocked products are affected. Raised with backend; if a catalog
 * endpoint lands, this is the only place that changes.
 */
export function useKitchenProductOptions() {
  const inventory = useKitchenInventory();

  const products = useMemo(() => {
    const byId = new Map<string, KitchenProduct>();
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

/**
 * Products selectable when requesting stock FROM a warehouse, derived from what
 * that warehouse actually holds (`GET /kitchen/warehouses/{id}/inventory`).
 *
 * This is deliberately NOT `useKitchenProductOptions`. Requesting is the one
 * flow where sourcing from the kitchen's own inventory is wrong: you can only
 * request what the warehouse can send, and — crucially — a product the kitchen
 * has never held must be requestable, or it can never make its first trip in.
 * Sourcing from the warehouse's stock resolves that bootstrap dead-end, since
 * the warehouse holds raw materials the kitchen has yet to receive.
 *
 * Pass an empty `warehouseId` before a warehouse is chosen; the query stays
 * disabled and this returns an empty list without erroring.
 */
export function useKitchenWarehouseProductOptions(warehouseId: string) {
  const inventory = useQuery({
    // What the warehouse holds — quantity only, no cost price. Read-only, and
    // gated server-side by the caller's token. Disabled until a warehouse is
    // chosen so the request form can call this unconditionally.
    queryKey: queryKeys.kitchenWarehouseInventory(warehouseId),
    queryFn: () => api.listKitchenWarehouseInventory(warehouseId),
    enabled: warehouseId !== "",
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });

  const products = useMemo(() => {
    const byId = new Map<string, KitchenProduct>();
    for (const item of inventory.data ?? []) {
      if (!byId.has(item.product_id)) byId.set(item.product_id, item.product);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory.data]);

  // On-hand at the warehouse, summed across batches, so the request form can
  // show "95 kg available" and the kitchen can size the ask against it. The
  // warehouse ledger is the authority — this is a hint, not a hard cap.
  const onHandById = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of inventory.data ?? []) {
      totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
    }
    return totals;
  }, [inventory.data]);

  return {
    products,
    onHandById,
    isLoading: inventory.isLoading,
    isFetching: inventory.isFetching,
    isError: inventory.isError,
    error: inventory.error,
  };
}

/**
 * Any stock movement can change both the on-hand list and which items are near
 * expiry, and labels are derived from the same rows — so all three refresh
 * together.
 */
export function useKitchenStockInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.kitchenInventory });
    qc.invalidateQueries({ queryKey: ["kitchen-near-expiry"] });
    qc.invalidateQueries({ queryKey: ["kitchen-labels"] });
    // A write-off adds a row to the waste log — refresh it too.
    qc.invalidateQueries({ queryKey: ["kitchen-waste"] });
  };
}

export function useWasteKitchenStock() {
  const invalidate = useKitchenStockInvalidation();

  return useMutation({
    mutationFn: (body: KitchenWasteInput) => api.wasteKitchenStock(body),
    onSuccess: () => {
      invalidate();
      toast.success("Stock written off");
    },
    onError: (err) => {
      // Two different failures, and the difference matters to the user: a 404
      // means the batch code does not match anything, which is the common typo,
      // while a 409 means the batch is real but holds less than they asked for.
      if (isNoSuchStock(err)) {
        toast.error("No stock found for that product/batch. Check the batch code.");
        return;
      }
      if (isInsufficientStock(err)) {
        // Waste can target a specific batch and/or expiry lot, so the payload
        // carries `batch_code` and `available` means that scope — "Only 2 of
        // batch B-CH-26 on hand, 5 requested". Says "lot" since the shortfall
        // may be a single expiry lot, not the whole batch.
        toast.error(stockAwareMessage(err, "Not enough stock in that lot."));
        return;
      }
      toast.error(stockAwareMessage(err, "Failed to write off stock"));
    },
  });
}
