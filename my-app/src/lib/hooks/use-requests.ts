"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdminInventoryFilters,
  RequestFilters,
  UpdateRequestStatusInput,
} from "@/lib/types/admin";
import { toast } from "sonner";

export function useProductRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.productRequests(filters),
    queryFn: () => api.listProductRequests(filters),
  });
}

export function useDistributionRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.distributionRequests(filters),
    queryFn: () => api.listDistributionRequests(filters),
  });
}

/**
 * Admin's read-only oversight of kitchen → warehouse requests.
 *
 * Read-only by contract: Admin never actions these, the transitions belong to
 * the kitchen and warehouse. There is deliberately no matching mutation hook.
 */
export function useAdminKitchenRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.adminKitchenRequests(filters),
    queryFn: () => api.listAdminKitchenRequests(filters),
  });
}

export function useAdminInventory(filters?: AdminInventoryFilters) {
  return useQuery({
    queryKey: queryKeys.adminInventory(filters),
    queryFn: () => api.listAdminInventory(filters),
  });
}

export function useRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.request(requestId),
    queryFn: () => api.getRequest(requestId),
    enabled: !!requestId,
  });
}

export function useUpdateRequestStatus(requestId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateRequestStatusInput) =>
      api.updateRequestStatus(requestId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.request(requestId) });
      qc.invalidateQueries({ queryKey: ["admin-requests-products"] });
      qc.invalidateQueries({ queryKey: ["admin-requests-distribution"] });
      toast.success("Request updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update request";
      toast.error(message);
    },
  });
}
