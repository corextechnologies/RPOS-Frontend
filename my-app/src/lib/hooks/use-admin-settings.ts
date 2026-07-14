"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { UpdateAdminProfileInput } from "@/lib/types/admin";
import { toast } from "sonner";

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.adminSettings,
    queryFn: () => api.getAdminSettings(),
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateAdminProfileInput) => api.updateAdminSettings(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminSettings });
      toast.success("Profile updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    },
  });
}
