"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";

export function useAdminBilling() {
  return useQuery({
    queryKey: queryKeys.adminBilling,
    queryFn: () => api.getMyBilling(),
  });
}
