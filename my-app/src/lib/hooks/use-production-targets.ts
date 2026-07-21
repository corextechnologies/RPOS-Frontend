"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  AdminProductionTargetFilters,
  CreateProductionTargetInput,
  KitchenProductionTargetFilters,
  UpdateProductionTargetInput,
} from "@/lib/types/production-target";
import { isDuplicateTarget } from "@/lib/types/production-target";
import { toast } from "sonner";

function message(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

// ---- Admin ----

export function useProductionTargets(filters?: AdminProductionTargetFilters) {
  return useQuery({
    queryKey: queryKeys.productionTargets(filters),
    queryFn: () => api.listProductionTargets(filters),
  });
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.acknowledgeProductionTarget(id),
    onSuccess: (target) => {
      qc.invalidateQueries({ queryKey: ["kitchen-production-targets"] });
      qc.setQueryData(queryKeys.kitchenProductionTarget(target.id), target);
      toast.success("Target acknowledged");
    },
    onError: (err) => toast.error(message(err, "Couldn't acknowledge target")),
  });
}

export function useCompleteProductionTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.completeProductionTarget(id),
    onSuccess: (target) => {
      qc.invalidateQueries({ queryKey: ["kitchen-production-targets"] });
      qc.setQueryData(queryKeys.kitchenProductionTarget(target.id), target);
      toast.success("Target marked complete");
    },
    onError: (err) => toast.error(message(err, "Couldn't complete target")),
  });
}
