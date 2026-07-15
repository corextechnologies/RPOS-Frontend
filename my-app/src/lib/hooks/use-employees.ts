"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateAdminUserInput, UpdateAdminUserInput } from "@/lib/types/admin";
import { toast } from "sonner";

export function useEmployees(page = 1) {
  return useQuery({
    queryKey: queryKeys.employees(page),
    queryFn: () => api.listEmployees({ page, page_size: 20 }),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAdminUserInput) => api.createUser(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Manager created");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to create manager";
      toast.error(message);
    },
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdminUserInput }) =>
      api.updateUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Employee updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update employee";
      toast.error(message);
    },
  });
}

export function useRevokeEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.revokeUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Manager access revoked");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to revoke access";
      toast.error(message);
    },
  });
}

export function useRestoreEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.restoreUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Manager access restored");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to restore access";
      toast.error(message);
    },
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success("Employee deleted");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete employee";
      toast.error(message);
    },
  });
}
