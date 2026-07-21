import type { IncomeForecastHorizon, IncomePeriodFilter } from "@/lib/types/income";
import type { RestaurantFilters } from "@/lib/types/super-admin";
import type {
  AdminCustomerFilters,
  AdminInventoryFilters,
  ProductPricingFilters,
  RequestFilters,
  SalesRecordFilters,
  SalesSummaryFilters,
} from "@/lib/types/admin";
import type { WarehouseRequestFilters } from "@/lib/types/warehouse";
import type { KitchenLabelFilters, KitchenRequestFilters } from "@/lib/types/kitchen";
import type {
  AdminProductionTargetFilters,
  KitchenProductionTargetFilters,
} from "@/lib/types/production-target";


export const queryKeys = {
  me: ["me"] as const,
  notifications: (page?: number) => ["notifications", page] as const,
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

  adminInventory: (filters?: AdminInventoryFilters) =>
    filters
      ? (["admin-inventory", filters] as const)
      : (["admin-inventory"] as const),
  adminKitchenRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-kitchen", filters] as const)
      : (["admin-requests-kitchen"] as const),

  kitchens: ["admin-kitchens"] as const,
  warehouses: ["admin-warehouses"] as const,
  employees: (page?: number) => ["admin-employees", page] as const,
  adminCustomers: (filters?: AdminCustomerFilters) =>
    filters
      ? (["admin-customers", filters] as const)
      : (["admin-customers"] as const),
  productPricing: (filters?: ProductPricingFilters) =>
    filters && Object.keys(filters).length
      ? (["admin-product-pricing", filters] as const)
      : (["admin-product-pricing"] as const),
  productRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-products", filters] as const)
      : (["admin-requests-products"] as const),
  distributionRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-distribution", filters] as const)
      : (["admin-requests-distribution"] as const),
  dispatchRequests: (filters?: RequestFilters) =>
    filters
      ? (["admin-requests-dispatch", filters] as const)
      : (["admin-requests-dispatch"] as const),
  request: (id: string) => ["admin-request", id] as const,
  adminSettings: ["admin-settings"] as const,
  productionTargets: (filters?: AdminProductionTargetFilters) =>
    filters && Object.keys(filters).length
      ? (["admin-production-targets", filters] as const)
      : (["admin-production-targets"] as const),
  productionTarget: (id: string) => ["admin-production-target", id] as const,
  kitchenProductionTargets: (filters?: KitchenProductionTargetFilters) =>
    filters && Object.keys(filters).length
      ? (["kitchen-production-targets", filters] as const)
      : (["kitchen-production-targets"] as const),
  kitchenProductionTarget: (id: string) =>
    ["kitchen-production-target", id] as const,
  salesRecords: (filters?: SalesRecordFilters) =>
    filters
      ? (["admin-sales-records", filters] as const)
      : (["admin-sales-records"] as const),
  salesSummary: (filters?: SalesSummaryFilters) =>
    filters
      ? (["admin-sales-summary", filters] as const)
      : (["admin-sales-summary"] as const),

  warehouseInventory: ["warehouse-inventory"] as const,
  warehouseProducts: ["warehouse-products"] as const,
  warehouseNearExpiry: (withinDays: number) =>
    ["warehouse-near-expiry", withinDays] as const,
  warehouseStaff: (page?: number) => ["warehouse-staff", page] as const,
  warehousePos: (filters?: WarehouseRequestFilters) =>
    filters ? (["warehouse-pos", filters] as const) : (["warehouse-pos"] as const),
  warehouseKitchenRequests: (filters?: WarehouseRequestFilters) =>
    filters
      ? (["warehouse-kitchen-requests", filters] as const)
      : (["warehouse-kitchen-requests"] as const),
  warehouseRequest: (id: string) => ["warehouse-request", id] as const,

  kitchenInventory: ["kitchen-inventory"] as const,
  kitchenWarehouseInventory: (warehouseId: string) =>
    ["kitchen-warehouse-inventory", warehouseId] as const,
  kitchenWarehouses: ["kitchen-warehouses"] as const,
  kitchenNearExpiry: (withinDays: number) =>
    ["kitchen-near-expiry", withinDays] as const,
  kitchenLabels: (filters?: KitchenLabelFilters) =>
    filters ? (["kitchen-labels", filters] as const) : (["kitchen-labels"] as const),
  kitchenCounts: (page?: number) => ["kitchen-counts", page] as const,
  kitchenStaff: (page?: number) => ["kitchen-staff", page] as const,
  kitchenWarehouseRequests: (filters?: KitchenRequestFilters) =>
    filters
      ? (["kitchen-warehouse-requests", filters] as const)
      : (["kitchen-warehouse-requests"] as const),
  kitchenBranchRequests: (filters?: KitchenRequestFilters) =>
    filters
      ? (["kitchen-branch-requests", filters] as const)
      : (["kitchen-branch-requests"] as const),
  kitchenDispatchRequests: (filters?: KitchenRequestFilters) =>
    filters
      ? (["kitchen-dispatch-requests", filters] as const)
      : (["kitchen-dispatch-requests"] as const),
  kitchenRequest: (id: string) => ["kitchen-request", id] as const,
};

