import type {
  IncomeForecast,
  IncomeForecastHorizon,
  IncomePeriodFilter,
  IncomeRestaurantRow,
  IncomeSummary,
} from "@/lib/types/income";
import { incomeFilterQuery } from "@/lib/types/income";
import { request, requestText } from "./client";

function normalizeSummary(data: IncomeSummary): IncomeSummary {
  return {
    ...data,
    by_restaurant: (data.by_restaurant ?? []).map(
      (r): IncomeRestaurantRow => ({
        ...r,
        restaurant_id: String(r.restaurant_id),
      }),
    ),
  };
}

export const incomeApi = {
  async getIncomeSummary(filter: IncomePeriodFilter): Promise<IncomeSummary> {
    const data = await request<IncomeSummary>(
      `/super-admin/income/summary?${incomeFilterQuery(filter)}`,
    );
    return normalizeSummary(data);
  },

  async getIncomeForecast(horizon: IncomeForecastHorizon): Promise<IncomeForecast> {
    return request<IncomeForecast>(`/super-admin/income/forecast?horizon=${horizon}`);
  },

  async downloadIncomeCsv(filter: IncomePeriodFilter): Promise<string> {
    return requestText(`/super-admin/income/export.csv?${incomeFilterQuery(filter)}`);
  },
};
