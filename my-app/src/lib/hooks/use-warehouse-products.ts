"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  CreateWarehouseProductInput,
  UpdateReorderLevelInput,
  UpdateWarehouseProductInput,
} from "@/lib/types/warehouse";
import {
  DUPLICATE_SKU,
  isMissingWarehouseAssignment,
} from "@/lib/types/warehouse";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

/**
 * The warehouse's product catalog — the source for every product picker here.
 *
 * Before Phase 4.1 the pickers were derived from inventory rows, which made a
 * never-stocked product impossible to receive: you could not pick it, because
 * picking it required already having it. This endpoint breaks that cycle.
 */
export function useWarehouseProducts() {
  return useQuery({
    queryKey: queryKeys.warehouseProducts,
    queryFn: () => api.listWarehouseProducts(),
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useCreateWarehouseProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWarehouseProductInput) =>
      api.createWarehouseProduct(body),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseProducts });
      // Creating a product also puts it on Admin's unpriced queue.
      qc.invalidateQueries({ queryKey: ["admin-product-pricing"] });
      toast.success(`${product.name} added. Admin will set its price.`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === DUPLICATE_SKU) {
        toast.error("A product with this SKU already exists.");
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to add product";
      toast.error(message);
    },
  });
}

/**
 * Edit a product's catalog metadata (name, SKU). Never touches stock — the
 * body has no quantity field to carry. Invalidates both the product catalog and
 * inventory, since inventory rows embed the product's name and SKU.
 */
export function useUpdateWarehouseProduct() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: UpdateWarehouseProductInput;
    }) => api.updateWarehouseProduct(productId, body),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseProducts });
      qc.invalidateQueries({ queryKey: queryKeys.warehouseInventory });
      toast.success(`${product.name} updated.`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === DUPLICATE_SKU) {
        toast.error("A product with this SKU already exists.");
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to update product";
      toast.error(message);
    },
  });
}

export function useSetReorderLevel() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: UpdateReorderLevelInput;
    }) => api.setWarehouseReorderLevel(productId, body),
    onSuccess: () => {
      // The limit drives the low-stock badge, which is computed from inventory.
      qc.invalidateQueries({ queryKey: queryKeys.warehouseInventory });
      toast.success("Low-stock limit updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to set the limit";
      toast.error(message);
    },
  });
}
