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
