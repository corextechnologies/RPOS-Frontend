"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdminProductionTargetFilters,
  AllocateProductionTargetInput,
  CreateProductionTargetInput,
  KitchenProductionTargetFilters,
  ProductionTarget,
  UpdateProductionTargetInput,
} from "@/lib/types/production-target";
import { isDuplicateTarget } from "@/lib/types/production-target";
import { toast } from "sonner";

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Refresh every view of a target after a transition. The lifecycle crosses
 * portals, so both the Admin and Kitchen lists are invalidated and the detail
 * caches are updated in place from the server's echo.
 */
function useTargetTransitionSuccess() {
  const qc = useQueryClient();
  return (target: ProductionTarget, successMessage: string) => {
    qc.invalidateQueries({ queryKey: ["admin-production-targets"] });
    qc.invalidateQueries({ queryKey: ["kitchen-production-targets"] });
    qc.setQueryData(queryKeys.productionTarget(target.id), target);
    qc.setQueryData(queryKeys.kitchenProductionTarget(target.id), target);
    // A dispatch turns into a branch delivery; let the Incoming screen refetch.
    qc.invalidateQueries({ queryKey: ["branch-deliveries"] });
    toast.success(successMessage);
  };
}

// ---- Admin ----

export function useProductionTargets(filters?: AdminProductionTargetFilters) {
  return useQuery({
    queryKey: queryKeys.productionTargets(filters),
    queryFn: () => api.listProductionTargets(filters),
  });
}

/** Targets the kitchen has acknowledged — everything past PENDING. */
export function useAcknowledgedProductionTargets() {
  const all = useProductionTargets();
  const acknowledged = useMemo(
    () => (all.data ?? []).filter((t) => t.status !== "PENDING"),
    [all.data],
  );
  return { ...all, data: acknowledged };
}

export function useProductionTarget(id: string | null) {
  return useQuery({
    queryKey: queryKeys.productionTarget(id ?? ""),
    queryFn: () => api.getProductionTarget(id as string),
    enabled: !!id,
  });
}

export function useCreateProductionTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductionTargetInput) => api.createProductionTarget(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-production-targets"] });
      toast.success("Production target created");
    },
    onError: (err) => {
      if (isDuplicateTarget(err)) {
        toast.error("That kitchen already has a target for this date.");
        return;
      }
      toast.error(message(err, "Couldn't create target"));
    },
  });
}

export function useUpdateProductionTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductionTargetInput }) =>
      api.updateProductionTarget(id, body),
    onSuccess: (target) => {
      qc.invalidateQueries({ queryKey: ["admin-production-targets"] });
      qc.setQueryData(queryKeys.productionTarget(target.id), target);
      toast.success("Production target updated");
    },
    onError: (err) => toast.error(message(err, "Couldn't update target")),
  });
}

export function useDeleteProductionTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProductionTarget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-production-targets"] });
      toast.success("Production target deleted");
    },
    onError: (err) => toast.error(message(err, "Couldn't delete target")),
  });
}

// ---- Kitchen ----

/** Kitchen-side: targets that reached COMPLETED or beyond — shown in Dispatch to Admin. */
export function useCompletedKitchenProductionTargets(enabled = true) {
  const all = useKitchenProductionTargets(undefined, enabled);
  const completed = useMemo(
    () =>
      (all.data ?? []).filter(
        (t) =>
          t.status === "COMPLETED" ||
          t.status === "ALLOCATED" ||
          t.status === "DISPATCHED" ||
          t.status === "RECEIVED",
      ),
    [all.data],
  );
  return { ...all, data: completed };
}

export function useKitchenProductionTargets(
  filters?: KitchenProductionTargetFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.kitchenProductionTargets(filters),
    queryFn: () => api.listKitchenProductionTargets(filters),
    enabled,
  });
}

export function useKitchenProductionTarget(id: string | null) {
  return useQuery({
    queryKey: queryKeys.kitchenProductionTarget(id ?? ""),
    queryFn: () => api.getKitchenProductionTarget(id as string),
    enabled: !!id,
  });
}

export function useAcknowledgeProductionTarget() {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: (id: string) => api.acknowledgeProductionTarget(id),
    onSuccess: (target) => onSuccess(target, "Target acknowledged"),
    onError: (err) => toast.error(message(err, "Couldn't acknowledge target")),
  });
}

export function useStartProductionTarget() {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: (id: string) => api.startProductionTarget(id),
    onSuccess: (target) => onSuccess(target, "Production started"),
    onError: (err) => toast.error(message(err, "Couldn't start production")),
  });
}

export function useMarkProductionLineProduced() {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: ({ id, lineId }: { id: string; lineId: string }) =>
      api.markProductionTargetLineProduced(id, lineId),
    // Marking a single line ready is high-frequency and self-evident on screen —
    // updating the caches silently avoids a toast per tap.
    onSuccess: (target) => onSuccess(target, "Line marked ready"),
    onError: (err) => toast.error(message(err, "Couldn't update line")),
  });
}

export function useCompleteProductionTarget() {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: (id: string) => api.completeProductionTarget(id),
    onSuccess: (target) => onSuccess(target, "Target complete — Admin notified"),
    onError: (err) => toast.error(message(err, "Couldn't complete target")),
  });
}

export function useDispatchProductionTarget() {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: (id: string) => api.dispatchProductionTarget(id),
    onSuccess: (target) => onSuccess(target, "Dispatched to branches"),
    onError: (err) => toast.error(message(err, "Couldn't dispatch target")),
  });
}

// ---- Admin allocation ----

export function useAllocateProductionTarget(id: string) {
  const onSuccess = useTargetTransitionSuccess();
  return useMutation({
    mutationFn: (body: AllocateProductionTargetInput) =>
      api.allocateProductionTarget(id, body),
    onSuccess: (target) => onSuccess(target, "Allocated to branches"),
    onError: (err) => toast.error(message(err, "Couldn't allocate target")),
  });
}
