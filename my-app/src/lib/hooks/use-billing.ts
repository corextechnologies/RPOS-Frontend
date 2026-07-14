"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

export function useAdminBilling() {
  return useQuery({
    queryKey: queryKeys.adminBilling,
    queryFn: () => api.getMyBilling(),
  });
}

export function useBillingOps(restaurantId?: string) {
  const qc = useQueryClient();

  const invalidateBilling = () => {
    if (restaurantId) {
      qc.invalidateQueries({ queryKey: queryKeys.billing(restaurantId) });
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) });
      qc.invalidateQueries({ queryKey: queryKeys.invoices(restaurantId) });
    }
    qc.invalidateQueries({ queryKey: ["restaurants"] });
    qc.invalidateQueries({ queryKey: queryKeys.adminBilling });
  };

  const recordPayment = useMutation({
    mutationFn: (id: string) => api.recordRestaurantPayment(id),
    onSuccess: () => {
      invalidateBilling();
      toast.success("Payment recorded — invoices created");
    },
    onError: (err) => {
      if (err instanceof ApiError && (err.status === 409 || err.code === "conflict")) {
        toast.error("Signup invoices already exist for this restaurant");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    },
  });

  const updateInvoice = useMutation({
    mutationFn: ({
      restaurantId: rid,
      invoiceId,
      paid,
    }: {
      restaurantId: string;
      invoiceId: string;
      paid: boolean;
    }) => api.updateInvoice(rid, invoiceId, { paid }),
    onSuccess: (_data, vars) => {
      invalidateBilling();
      toast.success(vars.paid ? "Invoice marked as paid" : "Invoice marked as unpaid");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update invoice");
    },
  });

  const runBillingCycle = useMutation({
    mutationFn: () => api.runBillingCycle(),
    onSuccess: (result) => {
      invalidateBilling();
      if (result.generated === 0) {
        toast.message("No invoices generated", {
          description: "No active restaurants have a due next billing date.",
        });
      } else {
        toast.success(
          result.generated === 1
            ? "1 invoice generated"
            : `${result.generated} invoices generated`,
        );
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to run billing cycle");
    },
  });

  return { recordPayment, updateInvoice, runBillingCycle };
}
