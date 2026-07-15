"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { CreateKitchenCountInput } from "@/lib/types/kitchen";
import {
  isMissingKitchenAssignment,
  KITCHEN_DUPLICATE_COUNT_LINE,
} from "@/lib/types/kitchen";
import { ApiError } from "@/lib/types/super-admin";
import { useKitchenStockInvalidation } from "./use-kitchen-inventory";
import { toast } from "sonner";

export const KITCHEN_COUNTS_PAGE_SIZE = 20;

/**
 * Counts are manager-only. Pass `enabled: false` for a sub-chef rather than
 * letting the query fire and 403 — the caller already knows the answer.
 */
export function useKitchenCounts(page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.kitchenCounts(page),
    queryFn: () =>
      api.listKitchenCounts({ page, page_size: KITCHEN_COUNTS_PAGE_SIZE }),
    enabled,
    retry: (failureCount, error) =>
      !isMissingKitchenAssignment(error) && failureCount < 3,
  });
}

export function useCreateKitchenCount() {
  const qc = useQueryClient();
  const invalidateStock = useKitchenStockInvalidation();

  return useMutation({
    mutationFn: (body: CreateKitchenCountInput) => api.createKitchenCount(body),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["kitchen-counts"] });
      // A count rewrites on-hand to the counted number, so the stock views are
      // stale the moment it lands — even when every line matched.
      invalidateStock();

      const differed = count.lines.filter((line) => line.variance !== 0).length;
      if (differed === 0) {
        toast.success("Count submitted. Everything matched system stock.");
      } else {
        toast.warning(
          `Count submitted. ${differed} of ${count.lines.length} products differed — inventory has been adjusted to match.`,
        );
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === KITCHEN_DUPLICATE_COUNT_LINE) {
        toast.error("The same product and batch appears twice in this count.");
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to submit count";
      toast.error(message);
    },
  });
}
