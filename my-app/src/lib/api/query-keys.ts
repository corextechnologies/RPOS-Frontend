import type { RestaurantFilters } from "@/lib/types/super-admin";

export const queryKeys = {
  me: ["me"] as const,
  restaurants: (filters?: RestaurantFilters) =>
    filters ? (["restaurants", filters] as const) : (["restaurants"] as const),
  restaurant: (id: string) => ["restaurant", id] as const,
  restaurantStats: ["restaurant-stats"] as const,
  billing: (id: string) => ["billing", id] as const,
  invoices: (id: string) => ["invoices", id] as const,
};
