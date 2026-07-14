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
}
