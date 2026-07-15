"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  CreatePurchaseOrderInput,
  WarehouseRequestFilters,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
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
