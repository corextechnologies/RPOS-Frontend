import type {
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  Employee,
  Kitchen,
  Paginated,
  ProductPricing,
  RequestFilters,
  StockRequest,
  UpdateLocationInput,
  UpdateProductPricingInput,
  UpdateRequestStatusInput,
  Warehouse,
} from "@/lib/types/admin";
import type {
  IncomeForecast,
  IncomeForecastHorizon,
  IncomePeriodFilter,
  IncomeSummary,
} from "@/lib/types/income";
import type {
  BillingSummary,
  ChangePasswordInput,
  CreateRestaurantInput,
  CreateRestaurantResult,
  ForgotPasswordInput,
  Invoice,
  MeResponse,
  ResetPasswordInput,
  Restaurant,
  RestaurantFilters,
  RestaurantStats,
  TokenResponse,
  UpdateRestaurantInput,
  BillingCycleResult,
} from "@/lib/types/super-admin";

export interface ApiClient {
  login(email: string, password: string): Promise<TokenResponse>;
  me(): Promise<MeResponse>;
  logout(): Promise<void>;
  forgotPassword(input: ForgotPasswordInput): Promise<void>;
  resetPassword(input: ResetPasswordInput): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;

  listRestaurants(filters?: RestaurantFilters): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant>;
  getRestaurantStats(): Promise<RestaurantStats>;
  createRestaurant(body: CreateRestaurantInput): Promise<CreateRestaurantResult>;
  updateRestaurant(id: string, body: UpdateRestaurantInput): Promise<Restaurant>;
  deleteRestaurant(id: string): Promise<void>;

  haltPlan(id: string): Promise<Restaurant>;
  activatePlan(id: string): Promise<Restaurant>;
  revokeAdminAccess(restaurantId: string): Promise<Restaurant>;
  restoreAdminAccess(restaurantId: string): Promise<Restaurant>;

  getBilling(restaurantId: string): Promise<BillingSummary>;
  getMyBilling(): Promise<BillingSummary>;
  runBillingCycle(): Promise<BillingCycleResult>;
  recordRestaurantPayment(restaurantId: string): Promise<BillingSummary>;
  updateInvoice(
    restaurantId: string,
    invoiceId: string,
    body: { paid: boolean },
  ): Promise<Invoice>;
  listInvoices(restaurantId: string): Promise<Invoice[]>;
  shareInvoice(invoiceId: string): Promise<Invoice>;
  unshareInvoice(invoiceId: string): Promise<Invoice>;

  listBranches(): Promise<Branch[]>;
  createBranch(body: CreateLocationInput): Promise<Branch>;
  updateBranch(id: string, body: UpdateLocationInput): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
  listKitchens(): Promise<Kitchen[]>;
  createKitchen(body: CreateLocationInput): Promise<Kitchen>;
  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(body: CreateLocationInput): Promise<Warehouse>;

  listEmployees(params?: { page?: number; page_size?: number }): Promise<Paginated<Employee>>;
  createUser(body: CreateAdminUserInput): Promise<CreateAdminUserResult>;

  listProductPricing(): Promise<ProductPricing[]>;
  updateProductPricing(
    productId: string,
    body: UpdateProductPricingInput,
  ): Promise<ProductPricing>;

  listProductRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>>;
  listDistributionRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>>;
  getRequest(requestId: string): Promise<StockRequest>;
  updateRequestStatus(
    requestId: string,
    body: UpdateRequestStatusInput,
  ): Promise<StockRequest>;
  getIncomeSummary(filter: IncomePeriodFilter): Promise<IncomeSummary>;
  getIncomeForecast(horizon: IncomeForecastHorizon): Promise<IncomeForecast>;
  downloadIncomeCsv(filter: IncomePeriodFilter): Promise<string>;

}
