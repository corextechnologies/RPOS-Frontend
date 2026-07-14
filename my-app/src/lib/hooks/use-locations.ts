"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateLocationInput, UpdateLocationInput } from "@/lib/types/admin";
import { toast } from "sonner";

export function useBranches() {
  return useQuery({
    queryKey: queryKeys.branches,
    queryFn: () => api.listBranches(),
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateLocationInput) => api.createBranch(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
      toast.success("Branch created");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create branch";
      toast.error(message);
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLocationInput }) =>
      api.updateBranch(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
      toast.success("Branch updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update branch";
      toast.error(message);
    },
  });
}

export function useDeleteBranch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.branches });
      toast.success("Branch deleted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete branch";
      toast.error(message);
    },
  });
}

export function useKitchens() {
  return useQuery({
    queryKey: queryKeys.kitchens,
    queryFn: () => api.listKitchens(),
  });
}

export function useCreateKitchen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateLocationInput) => api.createKitchen(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kitchens });
      toast.success("Kitchen created");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create kitchen";
      toast.error(message);
    },
  });
}

export function useUpdateKitchen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLocationInput }) =>
      api.updateKitchen(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kitchens });
      toast.success("Kitchen updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update kitchen";
      toast.error(message);
    },
  });
}

export function useDeleteKitchen() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteKitchen(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kitchens });
      toast.success("Kitchen deleted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete kitchen";
      toast.error(message);
    },
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: queryKeys.warehouses,
    queryFn: () => api.listWarehouses(),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateLocationInput) => api.createWarehouse(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses });
      toast.success("Warehouse created");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create warehouse";
      toast.error(message);
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLocationInput }) =>
      api.updateWarehouse(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses });
      toast.success("Warehouse updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update warehouse";
      toast.error(message);
    },
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteWarehouse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.warehouses });
      toast.success("Warehouse deleted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete warehouse";
      toast.error(message);
    },
  });
}
