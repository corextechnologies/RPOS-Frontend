"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { UpdateProductPricingInput } from "@/lib/types/admin";
import { toast } from "sonner";

/**
 * `unpriced` narrows to Admin's pricing queue — products the warehouse created
 * that still have no cost price. Each variant is cached separately, since they
 * are different server queries rather than a client-side filter.
 */
export function useProductPricing(unpriced = false) {
  return useQuery({
    queryKey: queryKeys.productPricing(unpriced),
    queryFn: () => api.listProductPricing({ unpriced }),
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
      // Prefix invalidation: pricing a product also drops it off the unpriced
      // queue, so both cached variants are stale.
      qc.invalidateQueries({ queryKey: ["admin-product-pricing"] });
      toast.success("Cost price updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update cost price";
      toast.error(message);
    },
  });
}
