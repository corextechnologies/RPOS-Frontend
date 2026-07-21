"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { AdminCustomerFilters } from "@/lib/types/admin";

/** Read-only list of the restaurant's customers, across every branch. */
export function useAdminCustomers(filters?: AdminCustomerFilters) {
  return useQuery({
    queryKey: queryKeys.adminCustomers(filters),
    queryFn: () => api.listAdminCustomers(filters),
  });
}
