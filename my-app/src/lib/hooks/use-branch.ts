"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { branchApi } from "@/lib/api/branch.api";
import { posErrorMessage, stockAwareMessage } from "@/lib/api/errors";
import type {
  BranchCustomerFilters,
  BranchOrderFilters,
  BranchWasteInput,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateBranchRequestInput,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
import type { RequestFilters } from "@/lib/types/admin";
import type { WasteEventFilters } from "@/lib/types/waste";
import type { DeviceCreateInput } from "@/lib/types/pos";

export const branchKeys = {
  devices: ["branch-devices"] as const,
  customers: (filters?: BranchCustomerFilters) =>
    filters ? (["branch-customers", filters] as const) : (["branch-customers"] as const),
  customer: (id: string) => ["branch-customer", id] as const,
  orders: (filters?: BranchOrderFilters) =>
    filters ? (["branch-orders", filters] as const) : (["branch-orders"] as const),
  kitchens: ["branch-kitchens"] as const,
  requests: (filters?: RequestFilters) =>
    filters ? (["branch-requests", filters] as const) : (["branch-requests"] as const),
  deliveries: ["branch-deliveries"] as const,
  inventory: ["branch-inventory"] as const,
  waste: (filters?: WasteEventFilters) =>
    filters && Object.keys(filters).length
      ? (["branch-waste", filters] as const)
      : (["branch-waste"] as const),
};

// ---- Terminals ----
//
// Live HTTP only (same as former pos-admin device calls) — POS login has no
// mock path, so a mocked registry would lie about what can sign in.

export function useBranchDevices() {
  return useQuery({
    queryKey: branchKeys.devices,
    queryFn: () => branchApi.listDevices(),
    retry: false,
  });
}

export function useRegisterBranchDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeviceCreateInput) => branchApi.registerDevice(input),
    // The caller shows the returned one-time activation code + QR; no toast here
    // (a toast would compete with the code panel for attention).
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.devices }),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useReissueBranchDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchApi.reissueDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.devices }),
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useRevokeBranchDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => branchApi.revokeDevice(id),
    onSuccess: (device) => {
      qc.invalidateQueries({ queryKey: branchKeys.devices });
      toast.success(`Terminal ${device.code ?? ""} revoked — it stops working immediately.`);
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

function message(err: unknown, fallback: string): string {
  // Sale/production shortfalls now carry the rich payload — surface the product
  // and numbers rather than the bare server sentence.
  return stockAwareMessage(err, fallback);
}

// ---- Customers ----

export function useBranchCustomers(filters?: BranchCustomerFilters) {
  return useQuery({
    queryKey: branchKeys.customers(filters),
    queryFn: () => api.listBranchCustomers(filters),
  });
}

export function useBranchCustomer(id: string | null) {
  return useQuery({
    queryKey: branchKeys.customer(id ?? ""),
    queryFn: () => api.getBranchCustomer(id as string),
    enabled: !!id,
  });
}

export function useCreateBranchCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBranchCustomerInput) => api.createBranchCustomer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-customers"] });
      toast.success("Customer added");
    },
    onError: (err) => toast.error(message(err, "Couldn't add customer")),
  });
}

export function useUpdateBranchCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBranchCustomerInput }) =>
      api.updateBranchCustomer(id, body),
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["branch-customers"] });
      qc.setQueryData(branchKeys.customer(customer.id), customer);
      toast.success("Customer updated");
    },
    onError: (err) => toast.error(message(err, "Couldn't update customer")),
  });
}

export function useDeleteBranchCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBranchCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-customers"] });
      toast.success("Customer removed");
    },
    onError: (err) => toast.error(message(err, "Couldn't remove customer")),
  });
}

// ---- Orders ----

export function useBranchOrders(filters?: BranchOrderFilters) {
  return useQuery({
    queryKey: branchKeys.orders(filters),
    queryFn: () => api.listBranchOrders(filters),
  });
}

/**
 * No error toast: a 409 `price_mismatch` is not a failure, it's a conversation
 * — the caller opens `PriceMismatchDialog` with the server's breakdown. Toasting
 * "Prices have changed" and dropping the detail would waste the whole contract.
 */
export function useCreateBranchOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBranchOrderInput) => api.createBranchOrder(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-orders"] });
      qc.invalidateQueries({ queryKey: branchKeys.inventory });
    },
  });
}

// ---- Stock requests (BRANCH_TO_ADMIN) ----

/** Kitchens the branch can direct a request to — the fulfilment picker source. */
export function useBranchKitchens() {
  return useQuery({
    queryKey: branchKeys.kitchens,
    queryFn: () => api.listBranchKitchens(),
  });
}

export function useBranchRequests(filters?: RequestFilters) {
  return useQuery({
    queryKey: branchKeys.requests(filters),
    queryFn: () => api.listBranchRequests(filters),
  });
}

/** Server-side request counts (open / received / rejected / total) for tiles. */
export function useBranchRequestsSummary() {
  return useQuery({
    queryKey: [...branchKeys.requests(), "summary"],
    queryFn: () => api.getBranchRequestsSummary(),
  });
}

export function useCreateBranchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBranchRequestInput) => api.createBranchRequest(body),
    onSuccess: () => {
      // Prefix invalidation covers every filtered variant of the list.
      qc.invalidateQueries({ queryKey: ["branch-requests"] });
      toast.success("Request sent to head office");
    },
    onError: (err) => toast.error(message(err, "Couldn't send request")),
  });
}

export function useReceiveBranchRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => api.receiveBranchRequest(requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-requests"] });
      qc.invalidateQueries({ queryKey: branchKeys.inventory });
      toast.success("Received into branch stock");
    },
    onError: (err) => toast.error(message(err, "Couldn't receive request")),
  });
}

// ---- Incoming deliveries (from the kitchen) ----

export function useBranchDeliveries() {
  return useQuery({
    queryKey: branchKeys.deliveries,
    queryFn: () => api.listBranchDeliveries(),
  });
}

export function useReceiveBranchDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.receiveBranchDelivery(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.deliveries });
      // Receiving credits branch stock.
      qc.invalidateQueries({ queryKey: branchKeys.inventory });
      toast.success("Received into branch stock");
    },
    onError: (err) => toast.error(message(err, "Couldn't receive delivery")),
  });
}

// ---- Inventory ----

export function useBranchInventory() {
  return useQuery({
    queryKey: branchKeys.inventory,
    queryFn: () => api.listBranchInventory(),
  });
}

/**
 * This branch's write-off history (waste + expiry).
 *
 * `enabled` gates the fetch: the endpoint is manager-only (same capability as
 * logging waste), so a non-manager must not fire it — a 403 would surface as an
 * error state on a table they should never have seen. Callers pass
 * `can("branch-waste:log")`.
 */
export function useBranchWasteEvents(
  filters?: WasteEventFilters,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: branchKeys.waste(filters),
    queryFn: () => api.listBranchWasteEvents(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useWasteBranchStock() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: BranchWasteInput) => api.wasteBranchStock(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: branchKeys.inventory });
      qc.invalidateQueries({ queryKey: ["branch-waste"] });
      toast.success("Stock written off");
    },
    onError: (err) =>
      toast.error(stockAwareMessage(err, "Failed to write off stock")),
  });
}

