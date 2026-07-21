import type {
  AdminProfile,
  AllocateDispatchInput,
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  CreateSaleInput,
  Employee,
  Kitchen,
  Paginated,
  ProductPricing,
  RequestFilters,
  SalesRecord,
  SalesRecordFilters,
  SalesSummary,
  SalesSummaryFilters,
  StockRequest,
  UpdateAdminProfileInput,
  UpdateAdminUserInput,
  UpdateLocationInput,
  UpdateProductPricingInput,
  UpdateRequestStatusInput,
  Warehouse,
  ProductPricingFilters,
  AdminInventoryItem,
  AdminInventoryFilters,
} from "@/lib/types/admin";
import type {
  IncomeForecast,
  IncomeForecastHorizon,
  IncomePeriodFilter,
  IncomeSummary,
} from "@/lib/types/income";
import type {
  AdjustStockInput,
  CreatePurchaseOrderInput,
  CreateWarehouseStaffInput,
  CreateWarehouseStaffResult,
  InventoryItem,
  NearExpiryFilters,
  ReceiveStockInput,
  UpdateWarehouseRequestStatusInput,
  WarehouseRequest,
  WarehouseRequestFilters,
  UpdateWarehouseStaffInput,
  WarehouseStaff,
  WasteStockInput,
  WarehouseProduct,
  WarehouseProductFilters,
  CreateWarehouseProductInput,
  ReorderLevel,
  UpdateReorderLevelInput,
} from "@/lib/types/warehouse";
import type {
  CreateKitchenProductInput,
  CreateKitchenRecipeInput,
  KitchenCatalogueItem,
  KitchenProduceInput,
  KitchenRecipe,
  CreateKitchenCountInput,
  CreateKitchenStaffInput,
  CreateKitchenStaffResult,
  CreateKitchenWarehouseRequestInput,
  UpdateKitchenStaffInput,
  CreateDispatchNotificationInput,
  KitchenCountFilters,
  KitchenInventoryItem,
  KitchenLabel,
  KitchenLabelFilters,
  KitchenNearExpiryFilters,
  KitchenRequest,
  KitchenRequestFilters,
  KitchenStaff,
  KitchenStockCount,
  KitchenWarehouse,
  KitchenWasteInput,
  UpdateKitchenRequestStatusInput,
} from "@/lib/types/kitchen";
import type {
  AppNotification,
  NotificationFilters,
} from "@/lib/types/notification";
import type {
  BranchCustomer,
  BranchCustomerFilters,
  BranchStaff,
  CreateBranchStaffInput,
  CreateBranchStaffResult,
  UpdateBranchStaffInput,
  BranchInventoryItem,
  BranchOrder,
  BranchOrderFilters,
  BranchDelivery,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateBranchRequestInput,
  CreateProductionRunInput,
  ProductionRun,
  ProductionRunFilters,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
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
  updateKitchen(id: string, body: UpdateLocationInput): Promise<Kitchen>;
  deleteKitchen(id: string): Promise<void>;
  listWarehouses(): Promise<Warehouse[]>;
  createWarehouse(body: CreateLocationInput): Promise<Warehouse>;
  updateWarehouse(id: string, body: UpdateLocationInput): Promise<Warehouse>;
  deleteWarehouse(id: string): Promise<void>;

  listEmployees(params?: { page?: number; page_size?: number }): Promise<Paginated<Employee>>;
  createUser(body: CreateAdminUserInput): Promise<CreateAdminUserResult>;
  updateUser(id: string, body: UpdateAdminUserInput): Promise<Employee>;
  revokeUser(id: string): Promise<Employee>;
  restoreUser(id: string): Promise<Employee>;
  deleteUser(id: string): Promise<void>;

  getAdminSettings(): Promise<AdminProfile>;
  updateAdminSettings(body: UpdateAdminProfileInput): Promise<AdminProfile>;

  recordSale(body: CreateSaleInput): Promise<SalesRecord>;
  listSalesRecords(filters?: SalesRecordFilters): Promise<Paginated<SalesRecord>>;
  getSalesSummary(filters?: SalesSummaryFilters): Promise<SalesSummary>;

  listProductPricing(filters?: ProductPricingFilters): Promise<ProductPricing[]>;
  listAdminInventory(filters?: AdminInventoryFilters): Promise<AdminInventoryItem[]>;
  listAdminKitchenRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>>;
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
  // Kitchen dispatch notifications (KITCHEN_TO_ADMIN): Admin reads the queue and
  // approves by allocating each line across branches. Reject reuses
  // updateRequestStatus; allocate carries per-branch quantities, so it has its
  // own endpoint.
  listDispatchRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>>;
  allocateDispatchRequest(
    requestId: string,
    body: AllocateDispatchInput,
  ): Promise<StockRequest>;
  // Notifications — shared by every portal. Polled; there is no push.
  listNotifications(
    filters?: NotificationFilters,
  ): Promise<Paginated<AppNotification>>;
  markNotificationRead(id: string): Promise<AppNotification>;

  getIncomeSummary(filter: IncomePeriodFilter): Promise<IncomeSummary>;
  getIncomeForecast(horizon: IncomeForecastHorizon): Promise<IncomeForecast>;
  downloadIncomeCsv(filter: IncomePeriodFilter): Promise<string>;

  // Warehouse (Phase 3) — auto-scoped to the caller's warehouse.
  listWarehouseInventory(): Promise<InventoryItem[]>;
  listWarehouseProducts(filters?: WarehouseProductFilters): Promise<WarehouseProduct[]>;
  createWarehouseProduct(
    body: CreateWarehouseProductInput,
  ): Promise<WarehouseProduct>;
  setWarehouseReorderLevel(
    productId: string,
    body: UpdateReorderLevelInput,
  ): Promise<ReorderLevel>;
  listNearExpiryInventory(filters?: NearExpiryFilters): Promise<InventoryItem[]>;
  receiveWarehouseStock(body: ReceiveStockInput): Promise<InventoryItem>;
  adjustWarehouseStock(body: AdjustStockInput): Promise<InventoryItem>;
  wasteWarehouseStock(body: WasteStockInput): Promise<InventoryItem>;
  listWarehouseUsers(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Paginated<WarehouseStaff>>;
  createWarehouseUser(
    body: CreateWarehouseStaffInput,
  ): Promise<CreateWarehouseStaffResult>;
  revokeWarehouseUser(id: string): Promise<WarehouseStaff>;
  restoreWarehouseUser(id: string): Promise<WarehouseStaff>;
  deleteWarehouseUser(id: string): Promise<void>;
  updateWarehouseUser(id: string, body: UpdateWarehouseStaffInput): Promise<WarehouseStaff>;
  createWarehousePo(body: CreatePurchaseOrderInput): Promise<WarehouseRequest>;
  listWarehousePos(
    filters?: WarehouseRequestFilters,
  ): Promise<Paginated<WarehouseRequest>>;
  listWarehouseKitchenRequests(
    filters?: WarehouseRequestFilters,
  ): Promise<Paginated<WarehouseRequest>>;
  getWarehouseRequest(requestId: string): Promise<WarehouseRequest>;
  updateWarehouseRequestStatus(
    requestId: string,
    body: UpdateWarehouseRequestStatusInput,
  ): Promise<WarehouseRequest>;

  // Kitchen (Phase 4) — auto-scoped to the caller's kitchen.
  listKitchenInventory(): Promise<KitchenInventoryItem[]>;
  listKitchenWarehouseInventory(
    warehouseId: string,
  ): Promise<KitchenInventoryItem[]>;
  listKitchenNearExpiry(
    filters?: KitchenNearExpiryFilters,
  ): Promise<KitchenInventoryItem[]>;
  listKitchenLabels(filters?: KitchenLabelFilters): Promise<KitchenLabel[]>;
  wasteKitchenStock(body: KitchenWasteInput): Promise<KitchenInventoryItem>;
  createKitchenCount(body: CreateKitchenCountInput): Promise<KitchenStockCount>;
  listKitchenCounts(
    filters?: KitchenCountFilters,
  ): Promise<Paginated<KitchenStockCount>>;
  listKitchenUsers(params?: {
    page?: number;
    page_size?: number;
  }): Promise<Paginated<KitchenStaff>>;
  createKitchenUser(
    body: CreateKitchenStaffInput,
  ): Promise<CreateKitchenStaffResult>;
  revokeKitchenUser(id: string): Promise<KitchenStaff>;
  restoreKitchenUser(id: string): Promise<KitchenStaff>;
  deleteKitchenUser(id: string): Promise<void>;
  updateKitchenUser(id: string, body: UpdateKitchenStaffInput): Promise<KitchenStaff>;
  listKitchenWarehouses(): Promise<KitchenWarehouse[]>;
  createKitchenWarehouseRequest(
    body: CreateKitchenWarehouseRequestInput,
  ): Promise<KitchenRequest>;
  listKitchenWarehouseRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>>;
  listKitchenBranchRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>>;
  // Dispatch notifications this kitchen raised to Admin (KITCHEN_TO_ADMIN).
  createDispatchNotification(
    body: CreateDispatchNotificationInput,
  ): Promise<KitchenRequest>;
  listKitchenDispatchRequests(
    filters?: KitchenRequestFilters,
  ): Promise<Paginated<KitchenRequest>>;
  // Head chef ships an allocated dispatch request (ALLOCATED → DISPATCHED),
  // debiting kitchen finished-goods stock.
  dispatchKitchenRequest(requestId: string): Promise<KitchenRequest>;
  // Finished goods, recipes & production. Recipes moved here from Admin when
  // products gained a `kind`: a recipe describes what the KITCHEN does with the
  // components the kitchen holds, and under Admin there was no catalogue to
  // attach it to.
  listKitchenCatalogue(): Promise<KitchenCatalogueItem[]>;
  createKitchenProduct(body: CreateKitchenProductInput): Promise<KitchenCatalogueItem>;
  listKitchenRecipes(): Promise<KitchenRecipe[]>;
  getKitchenRecipe(id: string): Promise<KitchenRecipe>;
  createKitchenRecipe(body: CreateKitchenRecipeInput): Promise<KitchenRecipe>;
  listKitchenProduction(): Promise<ProductionRun[]>;
  getKitchenProductionRun(id: string): Promise<ProductionRun>;
  produceKitchenProduct(body: KitchenProduceInput): Promise<ProductionRun>;

  getKitchenRequest(requestId: string): Promise<KitchenRequest>;
  updateKitchenRequestStatus(
    requestId: string,
    body: UpdateKitchenRequestStatusInput,
  ): Promise<KitchenRequest>;

  // Branch (Phase 5) — auto-scoped to the caller's branch.
  //
  // Note the POS (`/v1/pos`) is deliberately NOT on this contract: it needs a
  // device-bound token, server-authoritative tax packs and idempotent replay,
  // which are precisely the things a mock would get wrong. It lives in
  // `pos.api.ts` and talks to the live backend only.
  listBranchStaff(): Promise<BranchStaff[]>;
  createBranchStaff(body: CreateBranchStaffInput): Promise<CreateBranchStaffResult>;
  revokeBranchStaff(id: string): Promise<BranchStaff>;
  restoreBranchStaff(id: string): Promise<BranchStaff>;
  deleteBranchStaff(id: string): Promise<void>;
  updateBranchStaff(id: string, body: UpdateBranchStaffInput): Promise<BranchStaff>;
  listBranchCustomers(filters?: BranchCustomerFilters): Promise<Paginated<BranchCustomer>>;
  getBranchCustomer(id: string): Promise<BranchCustomer>;
  createBranchCustomer(body: CreateBranchCustomerInput): Promise<BranchCustomer>;
  updateBranchCustomer(id: string, body: UpdateBranchCustomerInput): Promise<BranchCustomer>;
  deleteBranchCustomer(id: string): Promise<void>;
  listBranchOrders(filters?: BranchOrderFilters): Promise<Paginated<BranchOrder>>;
  createBranchOrder(body: CreateBranchOrderInput): Promise<BranchOrder>;
  // Stock requests the branch raises to Admin (type BRANCH_TO_ADMIN). Read via
  // Admin's StockRequest projection, scoped to the caller's branch.
  // Kitchens this branch can direct a stock request to (the picker source).
  listBranchKitchens(): Promise<Kitchen[]>;
  listBranchRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>>;
  createBranchRequest(body: CreateBranchRequestInput): Promise<StockRequest>;
  // Finished goods the kitchen dispatched to this branch. Confirming receipt
  // (DISPATCHED → RECEIVED) credits branch inventory.
  listBranchDeliveries(): Promise<BranchDelivery[]>;
  receiveBranchDelivery(deliveryId: string): Promise<BranchDelivery>;
  listBranchInventory(): Promise<BranchInventoryItem[]>;
  listProductionRuns(filters?: ProductionRunFilters): Promise<Paginated<ProductionRun>>;
  getProductionRun(id: string): Promise<ProductionRun>;
  createProductionRun(body: CreateProductionRunInput): Promise<ProductionRun>;
}
