"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api";
import { posAdminApi } from "@/lib/api/pos-admin.api";

/**
 * The branch's own expected stock (§9). Live-only — like menu authoring, this
 * calls the backend directly and is not mocked. `retry: false` so a 403 in a
 * mock-demo tenant surfaces at once rather than spinning.
 */
export function useBranchPlanning(days = 7) {
  return useQuery({
    queryKey: queryKeys.branchPlanning(days),
    queryFn: () => posAdminApi.planning(days),
    retry: false,
  });
}
