"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateLocationInput } from "@/lib/types/admin";
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
