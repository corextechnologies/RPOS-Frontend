"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";

export function useEmployees(page = 1) {
  return useQuery({
    queryKey: queryKeys.employees(page),
    queryFn: () => api.listEmployees({ page, page_size: 20 }),
  });
}
