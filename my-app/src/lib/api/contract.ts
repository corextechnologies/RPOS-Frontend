import type {
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  Employee,
  Kitchen,
  Paginated,
  Warehouse,
} from "@/lib/types/admin";
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
  listInvoices(restaurantId: string): Promise<Invoice[]>;
  shareInvoice(invoiceId: string): Promise<Invoice>;
  unshareInvoice(invoiceId: string): Promise<Invoice>;

  listBranches(): Promise<Branch[]>;
  createBranch(body: CreateLocationInput): Promise<Branch>;
  listKitchens(): Promise<Kitchen[]>;
  createKitchen(body: CreateLocationInput): Promise<Kitchen>;
  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(body: CreateLocationInput): Promise<Warehouse>;

  listEmployees(params?: { page?: number; page_size?: number }): Promise<Paginated<Employee>>;
  createUser(body: CreateAdminUserInput): Promise<CreateAdminUserResult>;
}
