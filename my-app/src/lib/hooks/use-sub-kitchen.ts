"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { subKitchenErrorMessage } from "@/lib/api/errors";
import type { BranchWasteInput } from "@/lib/types/branch";
import type { WasteEventFilters } from "@/lib/types/waste";
import type {
  BranchNearExpiryFilters,
  CreateBatchInput,
  CompleteTicketInput,
  CreateSubKitchenRecipeInput,
  PrepBoardFilters,
  SetAvailabilityInput,
  SubKitchenStatsFilters,
  UpdatePrepStatusInput,
} from "@/lib/types/sub-kitchen";
import { toast } from "sonner";

export const PREP_BOARD_PAGE_SIZE = 50;

/** Query keys for the sub-kitchen, co-located like `branchKeys`. */
export const subKitchenKeys = {
  board: (filters?: PrepBoardFilters) =>
    filters ? (["sub-kitchen-board", filters] as const) : (["sub-kitchen-board"] as const),
  ticket: (id: string) => ["sub-kitchen-ticket", id] as const,
  recipes: ["sub-kitchen-recipes"] as const,
  recipe: (id: string) => ["sub-kitchen-recipe", id] as const,
  waste: (filters?: WasteEventFilters) =>
    filters && Object.keys(filters).length
      ? (["sub-kitchen-waste", filters] as const)
      : (["sub-kitchen-waste"] as const),
  availability: ["sub-kitchen-availability"] as const,
  stats: (filters?: SubKitchenStatsFilters) =>
    filters ? (["sub-kitchen-stats", filters] as const) : (["sub-kitchen-stats"] as const),
  nearExpiry: (filters?: BranchNearExpiryFilters) =>
    filters ? (["branch-near-expiry", filters] as const) : (["branch-near-expiry"] as const),
};

export function usePrepBoard(filters?: PrepBoardFilters) {
  return useQuery({
    queryKey: subKitchenKeys.board(filters),
    queryFn: () => api.listPrepBoard(filters),
  });
}

export function usePrepTicket(id: string | null) {
  return useQuery({
    queryKey: subKitchenKeys.ticket(id ?? ""),
    queryFn: () => api.getPrepTicket(id as string),
    enabled: !!id,
  });
}

/** Invalidate every board view and, when it moved stock, branch inventory. */
function useBoardInvalidator() {
  const qc = useQueryClient();
  return (movedStock = false) => {
    qc.invalidateQueries({ queryKey: ["sub-kitchen-board"] });
    if (movedStock) {
      qc.invalidateQueries({ queryKey: ["branch-inventory"] });
      qc.invalidateQueries({ queryKey: ["branch-waste"] });
    }
  };
}

export function useCreateBatchJob() {
  const invalidate = useBoardInvalidator();
  return useMutation({
    mutationFn: (body: CreateBatchInput) => api.createBatchJob(body),
    onSuccess: (ticket) => {
      invalidate();
      toast.success(`Queued ${ticket.quantity}× ${ticket.product_name}`);
    },
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

export function useUpdatePrepStatus() {
  const invalidate = useBoardInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePrepStatusInput }) =>
      api.updatePrepStatus(id, body),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

export function useCompletePrepTicket() {
  const invalidate = useBoardInvalidator();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body?: CompleteTicketInput }) =>
      api.completePrepTicket(id, body),
    onSuccess: (ticket) => {
      // Completing moves stock.
      invalidate(true);
      toast.success(`Completed ${ticket.quantity}× ${ticket.product_name}`);
    },
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

export function useCancelPrepTicket() {
  const invalidate = useBoardInvalidator();
  return useMutation({
    mutationFn: (id: string) => api.cancelPrepTicket(id),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

// ---- Recipes ----

export function useSubKitchenRecipes() {
  return useQuery({
    queryKey: subKitchenKeys.recipes,
    queryFn: () => api.listSubKitchenRecipes(),
  });
}

export function useSubKitchenRecipe(id: string | null) {
  return useQuery({
    queryKey: subKitchenKeys.recipe(id ?? ""),
    queryFn: () => api.getSubKitchenRecipe(id as string),
    enabled: !!id,
  });
}

export function useCreateSubKitchenRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubKitchenRecipeInput) => api.createSubKitchenRecipe(body),
    onSuccess: (recipe) => {
      qc.invalidateQueries({ queryKey: subKitchenKeys.recipes });
      toast.success(
        recipe.version > 1
          ? `Recipe saved (v${recipe.version}) — the previous one is retired.`
          : "Recipe saved.",
      );
    },
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

// ---- Waste ----

export function useSubKitchenWasteEvents(
  filters?: WasteEventFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: subKitchenKeys.waste(filters),
    queryFn: () => api.listSubKitchenWaste(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useLogSubKitchenWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BranchWasteInput) => api.logSubKitchenWaste(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-kitchen-waste"] });
      qc.invalidateQueries({ queryKey: ["branch-inventory"] });
      qc.invalidateQueries({ queryKey: ["branch-near-expiry"] });
      toast.success("Written off.");
    },
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

// ---- Sold out (86) ----

export function useSubKitchenAvailability() {
  return useQuery({
    queryKey: subKitchenKeys.availability,
    queryFn: () => api.listSubKitchenAvailability(),
  });
}

export function useSetSubKitchenAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ menuItemId, body }: { menuItemId: string; body: SetAvailabilityInput }) =>
      api.setSubKitchenAvailability(menuItemId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: subKitchenKeys.availability }),
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

// ---- Stats + near-expiry ----

export function useSubKitchenStats(filters?: SubKitchenStatsFilters) {
  return useQuery({
    queryKey: subKitchenKeys.stats(filters),
    queryFn: () => api.getSubKitchenStats(filters),
  });
}

export function useBranchNearExpiry(filters?: BranchNearExpiryFilters) {
  return useQuery({
    queryKey: subKitchenKeys.nearExpiry(filters),
    queryFn: () => api.listBranchNearExpiry(filters),
  });
}
