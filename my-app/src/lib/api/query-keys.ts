import type { IncomeForecastHorizon, IncomePeriodFilter } from "@/lib/types/income";
import type { RestaurantFilters } from "@/lib/types/super-admin";
import type {
  RequestFilters,
  SalesRecordFilters,
  SalesSummaryFilters,
} from "@/lib/types/admin";


export const queryKeys = {
  me: ["me"] as const,
  restaurants: (filters?: RestaurantFilters) =>
    filters ? (["restaurants", filters] as const) : (["restaurants"] as const),
  restaurant: (id: string) => ["restaurant", id] as const,
  restaurantStats: ["restaurant-stats"] as const,
  billing: (id: string) => ["billing", id] as const,
  adminBilling: ["admin-billing"] as const,
  invoices: (id: string) => ["invoices", id] as const,
  branches: ["admin-branches"] as const,
  incomeSummary: (filter: IncomePeriodFilter) => ["income-summary", filter] as const,
  incomeForecast: (horizon: IncomeForecastHorizon) => ["income-forecast", horizon] as const,

  kitchens: ["admin-kitchens"] as const,
  warehouses: ["admin-warehouses"] as const,
  employees: (page?: number) => ["admin-employees", page] as const,
  productPricing: ["admin-product-pricing"] as const,
  productRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-products", filters] as const)
      : (["admin-requests-products"] as const),
  distributionRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-distribution", filters] as const)
      : (["admin-requests-distribution"] as const),
  request: (id: string) => ["admin-request", id] as const,
  adminSettings: ["admin-settings"] as const,
  salesRecords: (filters?: SalesRecordFilters) =>
    filters
      ? (["admin-sales-records", filters] as const)
      : (["admin-sales-records"] as const),
  salesSummary: (filters?: SalesSummaryFilters) =>
    filters
      ? (["admin-sales-summary", filters] as const)
      : (["admin-sales-summary"] as const),
};

