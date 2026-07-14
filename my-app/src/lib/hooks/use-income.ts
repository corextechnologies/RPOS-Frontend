"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import type { IncomeForecastHorizon, IncomePeriodFilter } from "@/lib/types/income";

export function useIncomeSummary(filter: IncomePeriodFilter) {
  return useQuery({
    queryKey: queryKeys.incomeSummary(filter),
    queryFn: () => api.getIncomeSummary(filter),
  });
}

export function useIncomeForecast(horizon: IncomeForecastHorizon) {
  return useQuery({
    queryKey: queryKeys.incomeForecast(horizon),
    queryFn: () => api.getIncomeForecast(horizon),
  });
}

export async function downloadIncomeCsvFile(filter: IncomePeriodFilter, filename?: string) {
  const csv = await api.downloadIncomeCsv(filter);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    (`month` in filter
      ? `income-${filter.month}.csv`
      : `income-${filter.from_date}_${filter.to_date}.csv`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
