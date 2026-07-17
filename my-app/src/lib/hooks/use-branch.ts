"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/types/super-admin";
import type {
  BranchCustomerFilters,
  BranchOrderFilters,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateProductionRunInput,
  ProductionRunFilters,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";

export const branchKeys = {
  customers: (filters?: BranchCustomerFilters) =>
    filters ? (["branch-customers", filters] as const) : (["branch-customers"] as const),
  customer: (id: string) => ["branch-customer", id] as const,
  orders: (filters?: BranchOrderFilters) =>
    filters ? (["branch-orders", filters] as const) : (["branch-orders"] as const),
  inventory: ["branch-inventory"] as const,
  production: (filters?: ProductionRunFilters) =>
    filters ? (["branch-production", filters] as const) : (["branch-production"] as const),
  productionRun: (id: string) => ["branch-production-run", id] as const,
};

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError || err instanceof Error ? err.message : fallback;
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

// ---- Inventory ----

export function useBranchInventory() {
  return useQuery({
    queryKey: branchKeys.inventory,
    queryFn: () => api.listBranchInventory(),
  });
}

// ---- Sub-kitchen production ----

export function useProductionRuns(filters?: ProductionRunFilters) {
  return useQuery({
    queryKey: branchKeys.production(filters),
    queryFn: () => api.listProductionRuns(filters),
  });
}

export function useProductionRun(id: string | null) {
  return useQuery({
    queryKey: branchKeys.productionRun(id ?? ""),
    queryFn: () => api.getProductionRun(id as string),
    enabled: !!id,
  });
}

export function useCreateProductionRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductionRunInput) => api.createProductionRun(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-production"] });
      // A run consumes and produces branch stock, so inventory moved.
      qc.invalidateQueries({ queryKey: branchKeys.inventory });
      toast.success("Production run logged");
    },
    onError: (err) => toast.error(message(err, "Couldn't log production run")),
  });
}
