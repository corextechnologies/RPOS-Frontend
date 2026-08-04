"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  CreatePurchaseOrderInput,
  UpdateWarehouseRequestStatusInput,
  WarehouseRequestFilters,
} from "@/lib/types/warehouse";
import {
  insufficientStockDetails,
  isMissingWarehouseAssignment,
  STALE_STATUS,
} from "@/lib/types/warehouse";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

export const WAREHOUSE_REQUESTS_PAGE_SIZE = 20;

export function useWarehousePos(filters?: WarehouseRequestFilters) {
  return useQuery({
    queryKey: queryKeys.warehousePos(filters),
    queryFn: () => api.listWarehousePos(filters),
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useWarehouseKitchenRequests(filters?: WarehouseRequestFilters) {
  return useQuery({
    queryKey: queryKeys.warehouseKitchenRequests(filters),
    queryFn: () => api.listWarehouseKitchenRequests(filters),
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useWarehouseBranchRequests(filters?: WarehouseRequestFilters) {
  return useQuery({
    queryKey: queryKeys.warehouseBranchRequests(filters),
    queryFn: () => api.listWarehouseBranchRequests(filters),
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useWarehouseRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.warehouseRequest(id),
    queryFn: () => api.getWarehouseRequest(id),
    enabled: !!id,
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useCreateWarehousePo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreatePurchaseOrderInput) => api.createWarehousePo(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-pos"] });
      toast.success("Purchase order sent to Admin");
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to create purchase order";
      toast.error(message);
    },
  });
}

export function useUpdateWarehouseRequestStatus(requestId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateWarehouseRequestStatusInput) =>
      api.updateWarehouseRequestStatus(requestId, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouseRequest(requestId) });
      qc.invalidateQueries({ queryKey: ["warehouse-pos"] });
      qc.invalidateQueries({ queryKey: ["warehouse-kitchen-requests"] });
      // Dispatching removes stock, so the inventory views are now stale too.
      if (updated.status === "DISPATCHED") {
        qc.invalidateQueries({ queryKey: queryKeys.warehouseInventory });
        qc.invalidateQueries({ queryKey: ["warehouse-near-expiry"] });
      }
      toast.success("Request updated");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === STALE_STATUS) {
        toast.error("This request changed while you were viewing it. Refreshing.");
        qc.invalidateQueries({ queryKey: queryKeys.warehouseRequest(requestId) });
        return;
      }
      // Dispatch/allocation keeps its own bespoke copy — it names the
      // *in-date* total and warns that expired stock isn't dispatchable, which
      // the generic `insufficientStockMessage` can't say. Dispatch never
      // carries a `batch_code` (it sums across batches), so there's no batch
      // wording to add here. Other surfaces (sale, production, waste) use the
      // shared `stockAwareMessage`. Still require the numbers before the rich
      // copy — the defensive fallback the backend asked us to keep.
      const stock = insufficientStockDetails(err);
      if (
        stock &&
        typeof stock.available === "number" &&
        typeof stock.requested === "number"
      ) {
        const name = stock.product_name ?? "this product";
        toast.error(
          `Not enough ${name} to dispatch — ${stock.available} in date, ${stock.requested} requested. Expired stock isn't dispatchable.`,
        );
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update request";
      toast.error(message);
    },
  });
}
