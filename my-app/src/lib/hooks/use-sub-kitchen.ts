"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { subKitchenErrorMessage } from "@/lib/api/errors";
import type {
  CreateBatchInput,
  CompleteTicketInput,
  PrepBoardFilters,
  UpdatePrepStatusInput,
} from "@/lib/types/sub-kitchen";
import { toast } from "sonner";

export const PREP_BOARD_PAGE_SIZE = 50;

/** Query keys for the sub-kitchen, co-located like `branchKeys`. */
export const subKitchenKeys = {
  board: (filters?: PrepBoardFilters) =>
    filters ? (["sub-kitchen-board", filters] as const) : (["sub-kitchen-board"] as const),
  ticket: (id: string) => ["sub-kitchen-ticket", id] as const,
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
