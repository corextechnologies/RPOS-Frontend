"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  CreateDispatchNotificationInput,
  CreateKitchenWarehouseRequestInput,
  KitchenRequestFilters,
  UpdateKitchenRequestStatusInput,
} from "@/lib/types/kitchen";
import {
  isMissingKitchenAssignment,
  isStaleStatus,
} from "@/lib/types/kitchen";
import { toast } from "sonner";

export const KITCHEN_REQUESTS_PAGE_SIZE = 20;

/**
 * Warehouses this kitchen can pull from — the source for the request-stock
 * picker. Both kitchen roles may read it, so no permission gate here.
 */
export function useKitchenWarehouses() {
  return useQuery({
    queryKey: queryKeys.kitchenWarehouses,
    queryFn: () => api.listKitchenWarehouses(),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useKitchenWarehouseRequests(filters?: KitchenRequestFilters) {
  return useQuery({
    queryKey: queryKeys.kitchenWarehouseRequests(filters),
    queryFn: () => api.listKitchenWarehouseRequests(filters),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useKitchenBranchRequests(filters?: KitchenRequestFilters) {
  return useQuery({
    queryKey: queryKeys.kitchenBranchRequests(filters),
    queryFn: () => api.listKitchenBranchRequests(filters),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useKitchenDispatchRequests(filters?: KitchenRequestFilters) {
  return useQuery({
    queryKey: queryKeys.kitchenDispatchRequests(filters),
    queryFn: () => api.listKitchenDispatchRequests(filters),
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useCreateDispatchNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDispatchNotificationInput) =>
      api.createDispatchNotification(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-dispatch-requests"] });
      toast.success("Admin notified — waiting on allocation");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to notify Admin";
      toast.error(message);
    },
  });
}

/** Head chef ships an allocated dispatch — this is where kitchen stock leaves. */
export function useDispatchKitchenRequest(requestId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.dispatchKitchenRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kitchenRequest(requestId) });
      qc.invalidateQueries({ queryKey: ["kitchen-dispatch-requests"] });
      // Stock left the kitchen.
      qc.invalidateQueries({ queryKey: queryKeys.kitchenInventory });
      qc.invalidateQueries({ queryKey: ["kitchen-near-expiry"] });
      toast.success("Dispatched to branches");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to dispatch";
      toast.error(message);
    },
  });
}

export function useKitchenRequest(id: string) {
  return useQuery({
    queryKey: queryKeys.kitchenRequest(id),
    queryFn: () => api.getKitchenRequest(id),
    enabled: !!id,
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useCreateKitchenWarehouseRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateKitchenWarehouseRequestInput) =>
      api.createKitchenWarehouseRequest(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-warehouse-requests"] });
      toast.success("Request sent to the warehouse");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to send request";
      toast.error(message);
    },
  });
}

export function useUpdateKitchenRequestStatus(requestId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateKitchenRequestStatusInput) =>
      api.updateKitchenRequestStatus(requestId, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: queryKeys.kitchenRequest(requestId) });
      qc.invalidateQueries({ queryKey: ["kitchen-warehouse-requests"] });
      qc.invalidateQueries({ queryKey: ["kitchen-branch-requests"] });
      // ALLOCATED spends stock and RECEIVED credits it, so both leave the
      // inventory views stale. The two marker statuses change nothing.
      if (updated.status === "ALLOCATED" || updated.status === "RECEIVED") {
        qc.invalidateQueries({ queryKey: queryKeys.kitchenInventory });
        qc.invalidateQueries({ queryKey: ["kitchen-near-expiry"] });
        qc.invalidateQueries({ queryKey: ["kitchen-labels"] });
      }
      toast.success("Request updated");
    },
    onError: (err) => {
      // Expected on a shared kitchen screen, so it refetches rather than
      // presenting this as a failure the user did something wrong to cause.
      if (isStaleStatus(err)) {
        toast.error("This request changed while you were viewing it. Refreshing.");
        qc.invalidateQueries({ queryKey: queryKeys.kitchenRequest(requestId) });
        qc.invalidateQueries({ queryKey: ["kitchen-branch-requests"] });
        qc.invalidateQueries({ queryKey: ["kitchen-warehouse-requests"] });
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to update request";
      toast.error(message);
    },
  });
}
