"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { subKitchenErrorMessage } from "@/lib/api/errors";
import type { BranchWasteInput } from "@/lib/types/branch";
import type { WasteEventFilters } from "@/lib/types/waste";
import type { ProductKind } from "@/lib/types/admin";
import type {
  SubKitchenNearExpiryFilters,
  CreateBatchInput,
  CompleteTicketInput,
  PrepBoardFilters,
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
  waste: (filters?: WasteEventFilters) =>
    filters && Object.keys(filters).length
      ? (["sub-kitchen-waste", filters] as const)
      : (["sub-kitchen-waste"] as const),
  stats: (filters?: SubKitchenStatsFilters) =>
    filters ? (["sub-kitchen-stats", filters] as const) : (["sub-kitchen-stats"] as const),
  inventory: ["sub-kitchen-inventory"] as const,
  nearExpiry: (filters?: SubKitchenNearExpiryFilters) =>
    filters
      ? (["sub-kitchen-near-expiry", filters] as const)
      : (["sub-kitchen-near-expiry"] as const),
  products: (kind?: ProductKind, all?: boolean) =>
    ["sub-kitchen-products", kind ?? null, all ? "all" : "scoped"] as const,
};

/**
 * Products for the recipe pickers — `FINISHED_GOOD` (made) or `RAW_MATERIAL`
 * (components). `all` widens the ingredients list past what the branch stocks;
 * it has no effect on `FINISHED_GOOD`, which the server never scopes.
 */
export function useSubKitchenProducts(kind?: ProductKind, opts?: { all?: boolean }) {
  const all = opts?.all ?? false;
  return useQuery({
    queryKey: subKitchenKeys.products(kind, all),
    queryFn: () => api.listSubKitchenProducts(kind || all ? { kind, all } : undefined),
  });
}

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

/**
 * Invalidate every board view and, when it moved stock, both stock views.
 * The station and the branch manager read the same rows through two routes, so
 * a move has to expire both keys or one portal shows a stale shelf.
 */
function useBoardInvalidator() {
  const qc = useQueryClient();
  return (movedStock = false) => {
    qc.invalidateQueries({ queryKey: ["sub-kitchen-board"] });
    if (movedStock) {
      qc.invalidateQueries({ queryKey: ["sub-kitchen-inventory"] });
      qc.invalidateQueries({ queryKey: ["sub-kitchen-near-expiry"] });
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
      qc.invalidateQueries({ queryKey: ["sub-kitchen-inventory"] });
      qc.invalidateQueries({ queryKey: ["sub-kitchen-near-expiry"] });
      qc.invalidateQueries({ queryKey: ["branch-inventory"] });
      toast.success("Written off.");
    },
    onError: (err) => toast.error(subKitchenErrorMessage(err)),
  });
}

// ---- Stats ----

export function useSubKitchenStats(filters?: SubKitchenStatsFilters) {
  return useQuery({
    queryKey: subKitchenKeys.stats(filters),
    queryFn: () => api.getSubKitchenStats(filters),
  });
}

// ---- Stock the station works from ----

/**
 * Branch on-hand, read through the sub-kitchen's own route. Prefer this over
 * `useBranchInventory` anywhere the Chef can reach: it returns the same rows,
 * but `/branch/*` belongs to the branch manager and a chef has no claim on it.
 */
export function useSubKitchenInventory() {
  return useQuery({
    queryKey: subKitchenKeys.inventory,
    queryFn: () => api.listSubKitchenInventory(),
  });
}

export function useSubKitchenNearExpiry(filters?: SubKitchenNearExpiryFilters) {
  return useQuery({
    queryKey: subKitchenKeys.nearExpiry(filters),
    queryFn: () => api.listSubKitchenNearExpiry(filters),
  });
}
