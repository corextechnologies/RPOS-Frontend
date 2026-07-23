"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateWarehouseStaffInput } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { ApiError } from "@/lib/types/super-admin";
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
      // The API only emails credentials, so the invite is the whole outcome —
      // say plainly when it did not go out.
      if (result.credential_email_sent) {
        toast.success(`Invite emailed to ${result.email}`);
      } else {
        toast.warning(
          `Account created, but the invite email to ${result.email} could not be sent.`,
        );
      }
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
