"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateKitchenStaffInput } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

export const KITCHEN_STAFF_PAGE_SIZE = 20;

/**
 * The kitchen staff roster is manager-only. Pass `enabled: false` when the
 * caller cannot read it rather than letting the query fire and 403.
 */
export function useKitchenStaff(page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.kitchenStaff(page),
    queryFn: () =>
      api.listKitchenUsers({ page, page_size: KITCHEN_STAFF_PAGE_SIZE }),
    enabled,
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useCreateKitchenStaff() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateKitchenStaffInput) => api.createKitchenUser(body),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["kitchen-staff"] });
      // A roster record, not an account: nothing is emailed. Adding it is the
      // whole outcome.
      toast.success(`${result.full_name || result.email} added to the roster`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "conflict") {
        toast.error("That email is already in use.");
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to add staff member";
      toast.error(message);
    },
  });
}
