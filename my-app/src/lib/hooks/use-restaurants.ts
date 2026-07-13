"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, USE_MOCK } from "@/lib/api";
import type { Restaurant, RestaurantFilters, RestaurantStats } from "@/lib/types/super-admin";
import { toast } from "sonner";

function computeStats(restaurants: Restaurant[]): RestaurantStats {
  const active = restaurants.filter((r) => r.plan_status === "active").length;
  const halted = restaurants.filter((r) => r.plan_status === "halted").length;
  const revoked = restaurants.filter((r) => r.admin.access_status === "revoked").length;
  return {
    total: restaurants.length,
    active_plans: active,
    halted,
    revoked,
    by_plan_status: { active, halted },
  };
}

export function useRestaurantStats() {
  return useQuery({
    queryKey: queryKeys.restaurantStats,
    queryFn: async () => {
      if (USE_MOCK) return api.getRestaurantStats();
      const restaurants = await api.listRestaurants();
      return computeStats(restaurants);
    },
  });
}

export function useRestaurants(filters?: RestaurantFilters) {
  return useQuery({
    queryKey: queryKeys.restaurants(filters),
    queryFn: async () => {
      const all = await api.listRestaurants();
      if (!filters) return all;

      let result = [...all];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.admin.email.toLowerCase().includes(q) ||
            r.admin.phone.toLowerCase().includes(q),
        );
      }
      if (filters.plan_status && filters.plan_status !== "all") {
        result = result.filter((r) => r.plan_status === filters.plan_status);
      }
      if (filters.access_status && filters.access_status !== "all") {
        result = result.filter((r) => r.admin.access_status === filters.access_status);
      }
      return result;
    },
  });
}

export function useRestaurant(id: string) {
  return useQuery({
    queryKey: queryKeys.restaurant(id),
    queryFn: () => api.getRestaurant(id),
    enabled: !!id,
  });
}

export function useBilling(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.billing(restaurantId),
    queryFn: () => api.getBilling(restaurantId),
    enabled: !!restaurantId,
  });
}

export function useInvoices(restaurantId: string) {
  return useQuery({
    queryKey: queryKeys.invoices(restaurantId),
    queryFn: () => api.listInvoices(restaurantId),
    enabled: !!restaurantId,
  });
}

export function useRestaurantMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["restaurants"] });
    qc.invalidateQueries({ queryKey: queryKeys.restaurantStats });
  };

  const createRestaurant = useMutation({
    mutationFn: (body: Parameters<typeof api.createRestaurant>[0]) => api.createRestaurant(body),
    onSuccess: () => {
      invalidate();
      toast.success("Restaurant created");
    },
  });

  const updateRestaurant = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.updateRestaurant>[1] }) =>
      api.updateRestaurant(id, body),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(id) });
      invalidate();
      toast.success("Restaurant updated");
    },
  });

  const deleteRestaurant = useMutation({
    mutationFn: (id: string) => api.deleteRestaurant(id),
    onSuccess: () => {
      invalidate();
      toast.success("Restaurant deleted");
    },
  });

  const haltPlan = useMutation({
    mutationFn: (id: string) => api.haltPlan(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["restaurants"] });
      const lists = qc.getQueriesData<Restaurant[]>({ queryKey: ["restaurants"] });
      const snapshots = lists.map(([key, data]) => ({ key, data }));
      lists.forEach(([key, data]) => {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.map((r) => (r.id === id ? { ...r, plan_status: "halted" as const } : r)),
          );
        }
      });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(({ key, data }) => qc.setQueryData(key, data));
    },
    onSuccess: () => {
      invalidate();
      toast.success("Plan halted");
    },
  });

  const activatePlan = useMutation({
    mutationFn: (id: string) => api.activatePlan(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["restaurants"] });
      const lists = qc.getQueriesData<Restaurant[]>({ queryKey: ["restaurants"] });
      const snapshots = lists.map(([key, data]) => ({ key, data }));
      lists.forEach(([key, data]) => {
        if (Array.isArray(data)) {
          qc.setQueryData(
            key,
            data.map((r) => (r.id === id ? { ...r, plan_status: "active" as const } : r)),
          );
        }
      });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(({ key, data }) => qc.setQueryData(key, data));
    },
    onSuccess: () => {
      invalidate();
      toast.success("Plan activated");
    },
  });

  const revokeAccess = useMutation({
    mutationFn: (restaurantId: string) => api.revokeAdminAccess(restaurantId),
    onSuccess: () => {
      invalidate();
      toast.success("Admin access revoked");
    },
  });

  const restoreAccess = useMutation({
    mutationFn: (restaurantId: string) => api.restoreAdminAccess(restaurantId),
    onSuccess: () => {
      invalidate();
      toast.success("Admin access restored");
    },
  });

  const shareInvoice = useMutation({
    mutationFn: (invoiceId: string) => api.shareInvoice(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice shared with admin");
    },
  });

  const unshareInvoice = useMutation({
    mutationFn: (invoiceId: string) => api.unshareInvoice(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice unshared");
    },
  });

  return {
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    haltPlan,
    activatePlan,
    revokeAccess,
    restoreAccess,
    shareInvoice,
    unshareInvoice,
  };
}
