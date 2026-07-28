"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateWarehouseStaffInput } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { ApiError } from "@/lib/types/super-admin";
import { STAFF_STALE_TIME_MS } from "@/lib/types/staff";
import { toast } from "sonner";

export const WAREHOUSE_STAFF_PAGE_SIZE = 20;

/**
 * The staff list is manager-only. Pass `enabled: false` for warehouse staff
 * rather than letting the query fire and 403.
 */
export function useWarehouseStaff(page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.warehouseStaff(page),
    queryFn: () =>
      api.listWarehouseUsers({ page, page_size: WAREHOUSE_STAFF_PAGE_SIZE }),
    enabled,
    // Staff photos and CNIC scans are signed URLs that expire after ~15 min, so
    // cached rows go stale in a way a normal list never does. Refetch inside
    // that window, and again whenever the tab regains focus — coming back after
    // lunch is exactly the case that would otherwise render dead links.
    staleTime: STAFF_STALE_TIME_MS,
    refetchInterval: STAFF_STALE_TIME_MS,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}

export function useCreateWarehouseStaff() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWarehouseStaffInput) => api.createWarehouseUser(body),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["warehouse-staff"] });
      // No invite to send: warehouse staff are personnel records, not accounts.
      toast.success(`${result.full_name || result.email} added to the roster`);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "conflict") {
        toast.error("A user with this email already exists.");
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to add staff";
      toast.error(message);
    },
  });
}
