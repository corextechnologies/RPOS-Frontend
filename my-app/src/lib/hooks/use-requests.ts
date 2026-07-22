"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdminInventoryFilters,
  AllocateDispatchInput,
  RequestFilters,
  UpdateRequestStatusInput,
} from "@/lib/types/admin";
import type { WasteEventFilters } from "@/lib/types/waste";
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

/** Kitchen → Admin dispatch notifications awaiting allocation across branches. */
export function useDispatchRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.dispatchRequests(filters),
    queryFn: () => api.listDispatchRequests(filters),
  });
}

export function useAdminInventory(filters?: AdminInventoryFilters) {
  return useQuery({
    queryKey: queryKeys.adminInventory(filters),
    queryFn: () => api.listAdminInventory(filters),
  });
}

/** Admin's cross-location view of every waste/expiry write-off. */
export function useAdminWasteEvents(filters?: WasteEventFilters) {
  return useQuery({
    queryKey: queryKeys.adminWaste(filters),
    queryFn: () => api.listAdminWasteEvents(filters),
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
      qc.invalidateQueries({ queryKey: ["admin-requests-dispatch"] });
      toast.success("Request updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update request";
      toast.error(message);
    },
  });
}

/**
 * Admin approving a dispatch request by splitting each line across branches.
 * Separate from the status PATCH because it carries per-branch quantities.
 */
export function useAllocateDispatchRequest(requestId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: AllocateDispatchInput) =>
      api.allocateDispatchRequest(requestId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.request(requestId) });
      qc.invalidateQueries({ queryKey: ["admin-requests-dispatch"] });
      toast.success("Allocated to branches");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to allocate request";
      toast.error(message);
    },
  });
}
