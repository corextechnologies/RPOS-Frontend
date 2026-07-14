"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { RequestFilters } from "@/lib/types/admin";

export function useProductRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.productRequests(filters),
    queryFn: () => api.listProductRequests(filters),
  });
}

export function useDistributionRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: queryKeys.distributionRequests(filters),
    queryFn: () => api.listDistributionRequests(filters),
  });
}

export function useRequest(requestId: string) {
  return useQuery({
    queryKey: queryKeys.request(requestId),
    queryFn: () => api.getRequest(requestId),
    enabled: !!requestId,
  });
}
