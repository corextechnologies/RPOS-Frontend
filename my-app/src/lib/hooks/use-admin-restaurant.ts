"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { UpdateAdminRestaurantInput } from "@/lib/types/super-admin";
import { toast } from "sonner";

/** The admin's own restaurant, resolved server-side from the JWT. */
export function useMyRestaurant() {
  return useQuery({
    queryKey: queryKeys.adminRestaurant,
    queryFn: () => api.getMyRestaurant(),
  });
}

export function useUpdateMyRestaurant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateAdminRestaurantInput) => api.updateMyRestaurant(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.adminRestaurant });
      toast.success("Restaurant updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to update restaurant";
      toast.error(message);
    },
  });
}
