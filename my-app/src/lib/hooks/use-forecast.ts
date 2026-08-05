"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api";
import { forecastApi } from "@/lib/api/forecast.api";
import type {
  ForecastQuery,
  HotProductsQuery,
  NormalDemandQuery,
  UpcomingEventsQuery,
} from "@/lib/types/forecast";

/** The main forecast table. Disabled until a branch and start date are chosen. */
export function useForecast(query: ForecastQuery | null) {
  return useQuery({
    queryKey: queryKeys.forecast(query ?? ({} as ForecastQuery)),
    queryFn: () => forecastApi.forecast(query as ForecastQuery),
    enabled: !!query && !!query.branch_id && !!query.start,
  });
}

/** Hot products (ranked by units). Omit branch for the whole restaurant. */
export function useHotProducts(query?: HotProductsQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.hotProducts(query),
    queryFn: () => forecastApi.hotProducts(query),
    enabled,
  });
}

/** Upcoming events — the planning-screen alert strip. */
export function useUpcomingEvents(query?: UpcomingEventsQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.upcomingEvents(query),
    queryFn: () => forecastApi.upcomingEvents(query),
    enabled,
  });
}

/** Normal-demand diagnostic. Disabled until branch and date are chosen. */
export function useNormalDemand(query: NormalDemandQuery | null) {
  return useQuery({
    queryKey: queryKeys.normalDemand(query ?? ({} as NormalDemandQuery)),
    queryFn: () => forecastApi.normalDemand(query as NormalDemandQuery),
    enabled: !!query && !!query.branch_id && !!query.on,
  });
}
