"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { posErrorMessage } from "@/lib/api/errors";
import type {
  CreateDiscountRuleInput,
  CreateMenuItemInput,
  CreateModifierGroupInput,
} from "@/lib/types/pos";

export const posAdminKeys = {
  sellable: ["pos-admin-sellable-products"] as const,
  menu: (version?: number) => ["pos-admin-menu", version ?? "published"] as const,
  discountRules: ["pos-admin-discount-rules"] as const,
};

// ---- Menu ----

/**
 * The menu picker's source. Not `useProductPricing` — that returns the whole
 * catalogue including raw materials, which was issue 2.
 */
export function useSellableProducts() {
  return useQuery({
    queryKey: posAdminKeys.sellable,
    queryFn: () => posAdminApi.sellableProducts(),
    retry: false,
  });
}

export function usePublishedMenu(version?: number) {
  return useQuery({
    queryKey: posAdminKeys.menu(version),
    queryFn: () => posAdminApi.publishedMenu(version),
    retry: false,
  });
}

export function useCreateMenuVersion() {
  return useMutation({
    mutationFn: () => posAdminApi.createMenuVersion(),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useCreateMenuItem() {
  return useMutation({
    mutationFn: ({ versionId, input }: { versionId: number; input: CreateMenuItemInput }) =>
      posAdminApi.createMenuItem(versionId, input),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useCreateModifierGroup() {
  return useMutation({
    mutationFn: ({ versionId, input }: { versionId: number; input: CreateModifierGroupInput }) =>
      posAdminApi.createModifierGroup(versionId, input),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function usePublishMenuVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: number) => posAdminApi.publishMenuVersion(versionId),
    onSuccess: () => {
      // Every till reads the published menu; this is the moment it changes.
      qc.invalidateQueries({ queryKey: ["pos-admin-menu"] });
      toast.success("Menu published — tills will pick it up on their next sync.");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

// ---- Discount rules ----

export function useAdminDiscountRules() {
  return useQuery({
    queryKey: posAdminKeys.discountRules,
    queryFn: () => posAdminApi.listDiscountRules(),
    retry: false,
  });
}

export function useCreateAdminDiscountRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiscountRuleInput) => posAdminApi.createDiscountRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: posAdminKeys.discountRules });
      toast.success("Discount rule created");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}
