"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { UpdateProductPricingInput } from "@/lib/types/admin";
import { toast } from "sonner";

export function useProductPricing() {
  return useQuery({
    queryKey: queryKeys.productPricing,
    queryFn: () => api.listProductPricing(),
  });
}

export function useUpdateProductPricing() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      body,
    }: {
      productId: string;
      body: UpdateProductPricingInput;
    }) => api.updateProductPricing(productId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productPricing });
      toast.success("Cost price updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update cost price";
      toast.error(message);
    },
  });
}
