"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { ProductPricingFilters, UpdateProductPricingInput } from "@/lib/types/admin";
import { toast } from "sonner";

/**
 * Admin's catalogue, optionally narrowed.
 *
 * Each variant is cached separately, since they are different server queries
 * rather than a client-side filter. `unpriced` is the pricing queue; `kind` and
 * `sellable_only` split "what we buy" from "what we sell" — the distinction
 * that exists because flour and a burger used to be the same kind of row.
 */
export function useProductPricing(filters?: ProductPricingFilters) {
  return useQuery({
    queryKey: queryKeys.productPricing(filters),
    queryFn: () => api.listProductPricing(filters),
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
