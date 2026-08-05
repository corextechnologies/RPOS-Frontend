"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api";
import { kitchenApi } from "@/lib/api/kitchen.api";

/**
 * The kitchen's production plan (§8) — confirmed plans only, summed across
 * branches. Live-only, read-only. The whole kitchen router 403s for a
 * kitchen-off tenant, so the caller also gates the nav item on the feature.
 */
export function useKitchenPlanning(days = 7) {
  return useQuery({
    queryKey: queryKeys.kitchenPlanning(days),
    queryFn: () => kitchenApi.kitchenPlanning(days),
    retry: false,
  });
}
