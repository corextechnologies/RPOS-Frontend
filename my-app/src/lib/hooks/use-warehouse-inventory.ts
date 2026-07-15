"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export function useWarehouseInventory() {
  return useQuery({
    queryKey: queryKeys.warehouseInventory,
    queryFn: () => api.listWarehouseInventory(),
    // An unassigned manager stays unassigned until an Admin acts; retrying the
    // 409 just delays the empty state.
    retry: (failureCount, error) =>
      !isMissingWarehouseAssignment(error) && failureCount < 3,
  });
}
