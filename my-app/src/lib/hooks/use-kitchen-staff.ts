"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateKitchenStaffInput } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

export const KITCHEN_STAFF_PAGE_SIZE = 20;

/**
 * The sub-chef list is manager-only. Pass `enabled: false` for a sub-chef rather
 * than letting the query fire and 403.
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
      // The API only emails credentials, so the invite is the whole outcome —
      // say plainly when it did not go out. There is no resend endpoint yet, so
      // this offers no retry.
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
      const message = err instanceof Error ? err.message : "Failed to add sub-chef";
      toast.error(message);
    },
  });
}
