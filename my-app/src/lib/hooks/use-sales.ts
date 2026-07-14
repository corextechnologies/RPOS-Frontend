"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type {
  CreateSaleInput,
  SalesRecordFilters,
  SalesSummaryFilters,
} from "@/lib/types/admin";
import { toast } from "sonner";

export function useSalesRecords(filters?: SalesRecordFilters) {
  return useQuery({
    queryKey: queryKeys.salesRecords(filters),
    queryFn: () => api.listSalesRecords(filters),
  });
}

export function useSalesSummary(filters?: SalesSummaryFilters) {
  return useQuery({
    queryKey: queryKeys.salesSummary(filters),
    queryFn: () => api.getSalesSummary(filters),
  });
}

export function useRecordSale() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateSaleInput) => api.recordSale(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sales-records"] });
      toast.success("Sale recorded");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to record sale";
      toast.error(message);
    },
  });
}
