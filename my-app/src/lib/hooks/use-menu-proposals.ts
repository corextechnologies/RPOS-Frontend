"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { menuProposalApi } from "@/lib/api/menu-proposals.api";
import { posErrorMessage } from "@/lib/api/errors";
import type {
  ApproveMenuProposalInput,
  CreateMenuProposalInput,
  MenuProposalStatus,
} from "@/lib/types/menu-proposal";

export const menuProposalKeys = {
  chef: (status?: MenuProposalStatus) => ["menu-proposals", "chef", status ?? "all"] as const,
  admin: (status?: MenuProposalStatus) => ["menu-proposals", "admin", status ?? "all"] as const,
};

// ---- Sub-kitchen chef: propose / list own / withdraw ----

export function useChefProposals(status?: MenuProposalStatus) {
  return useQuery({
    queryKey: menuProposalKeys.chef(status),
    queryFn: () => menuProposalApi.listChefProposals(status),
    retry: false,
  });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuProposalInput) => menuProposalApi.createProposal(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-proposals", "chef"] });
      toast.success("Dish proposed. Waiting on admin review.");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useWithdrawProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => menuProposalApi.withdrawProposal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-proposals", "chef"] }),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

// ---- Admin: review queue / decide ----

export function useAdminProposals(status?: MenuProposalStatus) {
  return useQuery({
    queryKey: menuProposalKeys.admin(status),
    queryFn: () => menuProposalApi.listAdminProposals(status),
    retry: false,
  });
}

export function useApproveProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input?: ApproveMenuProposalInput }) =>
      menuProposalApi.approveProposal(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["menu-proposals", "admin"] }),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      menuProposalApi.rejectProposal(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menu-proposals", "admin"] });
      toast.success("Proposal rejected.");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}
