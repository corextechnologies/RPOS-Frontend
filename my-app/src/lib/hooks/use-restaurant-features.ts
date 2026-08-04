"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Tenant-level feature flags derived from the caller's own restaurant. Central
 * place for "does this restaurant have X?" questions so surfaces gate on one
 * source, not scattered role/permission checks.
 *
 * Only fetches for an ADMIN (the /admin/restaurant endpoint is Admin-scoped);
 * every other caller gets the safe defaults, which keep all surfaces visible.
 */
export interface RestaurantFeatures {
  /** False only for a tenant the Super Admin marked as having no cloud kitchen. */
  hasCentralKitchen: boolean;
  /** True while an Admin's restaurant profile is still loading. */
  isLoading: boolean;
}

export function useRestaurantFeatures(): RestaurantFeatures {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const query = useQuery({
    queryKey: queryKeys.adminRestaurant,
    queryFn: () => api.getMyRestaurant(),
    enabled: isAdmin,
  });

  return {
    // Unknown (loading, non-admin, or a backend not yet sending the flag) must
    // not hide surfaces — default every feature to on.
    hasCentralKitchen: query.data?.has_central_kitchen ?? true,
    isLoading: isAdmin && query.isLoading,
  };
}
