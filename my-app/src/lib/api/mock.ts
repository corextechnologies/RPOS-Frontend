/**
 * Mock Super Admin API — in-memory backend persisted to localStorage.
 */
import type {
  AdminCustomer,
  AdminCustomerFilters,
  AdminLocationType,
  AdminProfile,
  AdminRequestType,
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  Employee,
  RequestStatus,
  AllocateDispatchInput,
  RequestBranchAllocation,
  Kitchen,
  Paginated,
  ProductPricing,
  ProductPricingFilters,
  AdminInventoryItem,
  AdminInventoryFilters,
  RequestFilters,
  SalesRecord,
  SalesRecordFilters,
  SalesPeriod,
  SalesSummary,
  SalesSummaryBucket,
  SalesSummaryFilters,
  CreateSaleInput,
  DispatchedBatch,
  StockRequest,
  UpdateAdminProfileInput,
  UpdateAdminUserInput,
  UpdateLocationInput,
  UpdateProductPricingInput,
  UpdateRequestStatusInput,
  ProductKind,
  Warehouse,
} from "@/lib/types/admin";
import {
  ALLOCATION_EXCEEDS_READY,
  INVALID_KITCHEN_TARGET,
  MISSING_KITCHEN_TARGET,
} from "@/lib/types/admin";
import type {
  AppNotification,
  NotificationFilters,
} from "@/lib/types/notification";
import type {
  CreateDispatchNotificationInput,
  CreateKitchenCountInput,
  CreateKitchenStaffInput,
  CreateKitchenStaffResult,
  CreateKitchenWarehouseRequestInput,
  UpdateKitchenStaffInput,
  KitchenCountFilters,
  KitchenCountLine,
  KitchenInventoryItem,
  KitchenLabel,
  KitchenLabelFilters,
  KitchenNearExpiryFilters,
  KitchenRequest,
  KitchenRequestFilters,
  KitchenRequestStatus,
  KitchenRequestType,
  KitchenStaff,
  KitchenStockCount,
  KitchenWarehouse,
  KitchenWasteInput,
  StockUnit,
  UpdateKitchenRequestStatusInput,
} from "@/lib/types/kitchen";
import {
  KITCHEN_DUPLICATE_COUNT_LINE,
  KITCHEN_INVALID_REQUEST_TYPE,
  KITCHEN_INVALID_TRANSITION,
  KITCHEN_LINES_NOT_ALL_PRODUCED,
  MISSING_KITCHEN_ASSIGNMENT,
} from "@/lib/types/kitchen";
import type {
  CreateKitchenProductInput,
  CreateKitchenRecipeInput,
  KitchenCatalogueItem,
  KitchenProduceInput,
  KitchenRecipe,
} from "@/lib/types/kitchen";
import type { StaffDocumentKind } from "@/lib/types/staff";
import type {
  BranchCustomer,
  BranchCustomerFilters,
  BranchDelivery,
  BranchStaff,
  CreateBranchStaffInput,
  CreateBranchStaffResult,
  UpdateBranchStaffInput,
  BranchInventoryItem,
  BranchWasteInput,
  BranchOrder,
  BranchOrderFilters,
  CreateBranchCustomerInput,
  CreateBranchOrderInput,
  CreateBranchRequestInput,
  ProductionRun,
  UpdateBranchCustomerInput,
} from "@/lib/types/branch";
import { MISSING_BRANCH_ASSIGNMENT } from "@/lib/types/branch";
import type {
  SubKitchenNearExpiryFilters,
  CreateBatchInput,
  CompleteTicketInput,
  CreateSubKitchenRecipeInput,
  PrepBoardFilters,
  PrepStatus,
  PrepTicket,
  SubKitchenProduct,
  SubKitchenProductFilters,
  SubKitchenRecipe,
  SubKitchenStats,
  SubKitchenStatsFilters,
  UpdatePrepStatusInput,
} from "@/lib/types/sub-kitchen";
import {
  PREP_INVALID_TRANSITION,
  PREP_NOT_OPEN,
  PREP_USE_COMPLETE_ENDPOINT,
} from "@/lib/types/sub-kitchen";
import {
  isPrepOpen,
  isPrepTransitionAllowed,
} from "@/lib/sub-kitchen/prep-transitions";
import type {
  AdminProductionTargetFilters,
  AllocateProductionTargetInput,
  CreateProductionTargetInput,
  KitchenProductionTargetFilters,
  ProductionTarget,
  ProductionTargetAllocation,
  UpdateProductionTargetInput,
} from "@/lib/types/production-target";
import {
  DUPLICATE_TARGET,
  INVALID_TARGET_STATUS,
  TARGET_ALLOCATION_EXCEEDS_PRODUCED,
  TARGET_NOT_DELETABLE,
  TARGET_NOT_EDITABLE,
} from "@/lib/types/production-target";
import { POS_ERROR } from "@/lib/api/errors";
import { tryConvertQty } from "@/lib/unit-convert";
import type { BranchPosition } from "@/lib/types/super-admin";
import type { Capability } from "@/lib/types/pos";
// Mock and live agree on the state machine by sharing the real map, the same way
// the warehouse mock does.
import {
  isResaleOnlyBranchRequest,
  kitchenAllowedTransitions,
} from "@/lib/kitchen/request-transitions";
import {
  ApiError,
  type BillingSummary,
  type ChangePasswordInput,
  type CreateRestaurantInput,
  type CreateRestaurantResult,
  type ForgotPasswordInput,
  type Invoice,
  type MeResponse,
  type PlanTier,
  type ResetPasswordInput,
  type Restaurant,
  type RestaurantFilters,
  type RestaurantStats,
  type TokenResponse,
  type UpdateAdminRestaurantInput,
  type UserRole,
} from "@/lib/types/super-admin";
import type {
  AdjustStockInput,
  CreatePurchaseOrderInput,
  CreateWarehouseStaffInput,
  CreateWarehouseStaffResult,
  UpdateWarehouseStaffInput,
  InventoryItem,
  NearExpiryFilters,
  ReceiveStockInput,
  StockLocationType,
  UpdateWarehouseRequestStatusInput,
  WarehouseRequest,
  WarehouseRequestFilters,
  WarehouseProduct,
  WarehouseProductFilters,
  WarehouseProductKind,
  CreateWarehouseProductInput,
  UpdateWarehouseProductInput,
  ReorderLevel,
  UpdateReorderLevelInput,
  WarehouseRequestStatus,
  WarehouseRequestType,
  WarehouseStaff,
  WasteStockInput,
  UpdateStockExpiryInput,
} from "@/lib/types/warehouse";
import type {
  WasteEvent,
  WasteEventFilters,
  WasteLocationType,
  UpdateWasteEventInput,
} from "@/lib/types/waste";
import {
  DUPLICATE_SKU,
  INSUFFICIENT_STOCK,
  INVALID_MOVEMENT_TYPE,
  INVALID_QUANTITY,
  INVALID_RECEIVED_QUANTITY,
  INVALID_TRANSITION,
  MISSING_LINE_RECEIPTS,
  MISSING_WAREHOUSE_ASSIGNMENT,
  MISSING_WAREHOUSE_TARGET,
  NOTHING_REPORTED,
} from "@/lib/types/warehouse";
import { warehouseAllowedTransitions } from "@/lib/warehouse/request-transitions";
import type { ApiClient } from "./contract";
import { apiConfig } from "./config";
import { addOneBillingMonth, defaultNextBillingDate, planAmountForTier, planByTier, todayBillingDate } from "@/lib/plans/catalog";
import {
  buildMockIncomeCsv,
  buildMockIncomeForecast,
  buildMockIncomeSummary,
} from "./mock-income";
import { tokens } from "./tokens";
import { allowedTransitions } from "@/lib/admin/request-transitions";

const DB_KEY = "ros-super-admin-mock-db";
const SESSION_KEY = "ros-super-admin-session";

/**
 * Match a stored string product id ("prod-006") to a numeric wire id (6).
 *
 * Recipe/production DTOs carry `product_id`/`component_product_id` as numbers,
 * but the mock stores products under string ids. Comparing the two directly
 * (`p.id === String(6)`) never matches, so every recipe lookup went through
 * this numeric-portion convention — the same one the recipe form uses on save.
 */
const matchesProductId = (storedId: string, wireId: number | string): boolean =>
  Number(String(storedId).replace(/\D/g, "")) === Number(wireId);

/**
 * Idempotency-Key → the run it first produced. Session-scoped (a plain Map, not
 * persisted) — enough to mirror the live replay so a retried "Mark made" returns
 * the original run instead of producing and crediting stock twice.
 */
const producedByIdempotencyKey = new Map<string, ProductionRun>();
/**
 * Bump this whenever `MockDb`'s SHAPE changes, not just its contents — an
 * existing database in localStorage is reseeded only on a version change, so a
 * new table added without a bump loads as `undefined` and the first `.filter()`
 * on it throws.
 *
 * 17: branch portal — `customers`, `branch_orders`, `production_runs`, a second
 *     branch (br-002), and selling_price/category/is_available on products.
 * 21: `waste_events` — write-off history for the Waste & expired table.
 */
const SEED_VERSION = 31;

interface MockInvoiceRecord {
  id: number;
  restaurant_id: string;
  amount: string;
  issued_on: string;
  paid: boolean;
}

const MOCK_SUPER_ADMIN_EMAIL = apiConfig.mockDemoEmail;
const MOCK_SUPER_ADMIN_PASSWORD = apiConfig.mockDemoPassword;

interface MockUserAccount {
  email: string;
  password: string;
  me: MeResponse;
  image_url?: string | null;
}

interface MockResetToken {
  email: string;
  expires: number;
}

interface MockEmployee extends Employee {
  restaurant_id: string;
  /** Free-text job title for kitchen roster staff (shown as "Role"). */
  job_title?: string | null;
}

interface MockProduct extends ProductPricing {
  restaurant_id: string;
  /** Unit of measure, chosen when the product is created. Defaults to EACH. */
  stock_unit?: StockUnit;
  /**
   * Optional pack helper: 1 pack = N stock units. Display/request UX only;
   * ledger quantity stays in stock_unit.
   */
  units_per_pack?: number | null;
}

/**
 * The stored request vocabulary is wider than either portal's public one: the
 * warehouse never sees REJECTED or FORWARDED_TO_KITCHEN, and Admin never sees
 * KITCHEN_TO_WAREHOUSE. Each projection narrows back down.
 *
 * Since Phase 4.1 Admin both sees and sends DISPATCHED — on a PO it means Admin
 * shipped to the warehouse, on a kitchen request it means the warehouse shipped
 * to the kitchen. `RequestStatus` already covers it, so the status alias is just
 * `RequestStatus`; it stays named for symmetry with `MockRequestType`.
 */
type MockRequestType = AdminRequestType | "KITCHEN_TO_WAREHOUSE";
type MockRequestStatus = RequestStatus;

interface MockStockRequest extends Omit<StockRequest, "type" | "status"> {
  type: MockRequestType;
  status: MockRequestStatus;
  restaurant_id: string;
  // Warehouse-facing fields (Phase 3). One request store keeps the cross-portal
  // flow honest — a PO raised here still lands in Admin's inbox, which reads the
  // Admin projection and ignores everything below.
  requester_id?: number | null;
  assignee_id?: number | null;
  source_location_type?: StockLocationType | null;
  source_location_id?: string | null;
  target_location_type?: StockLocationType | null;
  target_location_id?: string | null;
}

interface MockInventoryItem extends Omit<InventoryItem, "product"> {
  restaurant_id: string;
  /**
   * A stored row keeps only product identity; `kind` and `stock_unit` are
   * resolved from the catalog (`db.products`) when serialized to the public
   * shape, so they are omitted here rather than duplicated (and left to drift).
   */
  product: { id: string; name: string; sku?: string | null };
}

interface MockWasteEvent extends WasteEvent {
  restaurant_id: string;
}

/** A submitted kitchen stock count. Scoped to one kitchen and its author. */
interface MockStockCount extends KitchenStockCount {
  restaurant_id: string;
}

/**
 * A branch customer.
 *
 * Scoped to a branch, not a restaurant — cross-branch duplicates are expected
 * and correct. Two branches of the same chain each holding "Ali, 0300…" are two
 * records; deduping them is CRM, which is out of scope.
 *
 * `deleted_at` because the delete is soft: past orders keep their customer, but
 * a deleted one can't be attached to a new order.
 */
interface MockCustomer extends BranchCustomer {
  restaurant_id: string;
  deleted_at: string | null;
}

interface MockBranchOrder extends BranchOrder {
  restaurant_id: string;
  branch_id: string;
}

interface MockProductionRun extends ProductionRun {
  restaurant_id: string;
}

/**
 * A sub-kitchen prep ticket. Carries the batch_code/expiry it was created with
 * (used at completion unless overridden) — internal, not in the public shape.
 */
interface MockPrepTicket extends PrepTicket {
  restaurant_id: string;
  create_batch_code: string | null;
  create_expiry_date: string | null;
}

interface MockSubKitchenRecipe extends SubKitchenRecipe {
  restaurant_id: string;
  branch_id: string;
}


/** A daily production target, tenant-scoped and keyed to one kitchen. */
interface MockProductionTarget extends ProductionTarget {
  restaurant_id: string;
}

interface MockRecipe extends KitchenRecipe {
  restaurant_id: string;
  kitchen_id: string;
}

interface MockDb {
  _seed: number;
  restaurants: Restaurant[];
  invoices: MockInvoiceRecord[];
  users: MockUserAccount[];
  resetTokens: Record<string, MockResetToken>;
  branches: Branch[];
  kitchens: Kitchen[];
  warehouses: Warehouse[];
  employees: MockEmployee[];
  products: MockProduct[];
  requests: MockStockRequest[];
  sales: SalesRecord[];
  inventory: MockInventoryItem[];
  stock_counts: MockStockCount[];
  notifications: MockNotification[];
  customers: MockCustomer[];
  kitchen_recipes: MockRecipe[];
  branch_orders: MockBranchOrder[];
  production_runs: MockProductionRun[];
  production_targets: MockProductionTarget[];
  /** Sub-kitchen prep board — one branch's prep tickets. */
  prep_tickets: MockPrepTicket[];
  /** Chef-owned prep recipes, versioned. */
  sub_kitchen_recipes: MockSubKitchenRecipe[];
  /**
   * Low-stock limits, per product PER LOCATION. Not on the inventory row: the
   * limit is compared against total on hand across every batch, so it cannot
   * live on a per-batch row.
   */
  reorder_levels: MockReorderLevel[];
  /** Write-off history — every waste/expiry event, across all locations. */
  waste_events: MockWasteEvent[];
}

interface MockNotification extends AppNotification {
  restaurant_id: string;
  user_id: string;
}

interface MockReorderLevel {
  restaurant_id: string;
  product_id: string;
  location_type: StockLocationType;
  location_id: string;
  reorder_level: number;
}

const now = () => new Date().toISOString();

const isoDaysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one in onboarding counts). */
function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localCreatedAt(d = new Date()): string {
  return `${localYmd(d)}T12:00:00`;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function randomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Branch capabilities, mirroring what live `/auth/me` returns. The manager holds
 * the full station set; a CHEF holds read + operate for prep, plus inventory
 * read, but not WASTE_LOG or any menu capability. Non-branch roles get `[]`.
 */
const MANAGER_CAPABILITIES: Capability[] = [
  "ORDER_READ",
  "ORDER_CREATE",
  "CUSTOMER_READ",
  "CUSTOMER_CREATE",
  "INVENTORY_READ",
  "WASTE_LOG",
  "PREP_READ",
  "PREP_OPERATE",
];
const CHEF_CAPABILITIES: Capability[] = ["INVENTORY_READ", "PREP_OPERATE", "PREP_READ"];

/**
 * The capability list the server would derive from a branch position. Only CHEF
 * is load-bearing for the portal (till roles gate on the POS bootstrap's own
 * capability list, not `/auth/me`), so those come back empty here.
 */
function capabilitiesForPosition(position: BranchPosition | null | undefined): Capability[] {
  return position === "CHEF" ? [...CHEF_CAPABILITIES] : [];
}

function seedUsers(): MockUserAccount[] {
  const users: MockUserAccount[] = [];

  if (MOCK_SUPER_ADMIN_EMAIL && MOCK_SUPER_ADMIN_PASSWORD) {
    users.push({
      email: MOCK_SUPER_ADMIN_EMAIL,
      password: MOCK_SUPER_ADMIN_PASSWORD,
      me: {
        id: 1,
        email: MOCK_SUPER_ADMIN_EMAIL,
        full_name: "Super Admin",
        role: "SUPER_ADMIN",
        restaurant_id: null,
        created_by_id: null,
        is_active: true,
      },
    });
  }

  users.push(
    {
      email: "admin@demo-restaurant.ros",
      password: "Demo@1234",
      me: {
        id: 2,
        email: "admin@demo-restaurant.ros",
        full_name: "Alex Rivera",
        role: "ADMIN",
        restaurant_id: 1,
        created_by_id: 1,
        is_active: true,
      },
    },
    {
      email: "warehouse@demo.ros",
      password: "Demo@1234",
      me: {
        id: 3,
        email: "warehouse@demo.ros",
        full_name: "Sam Warehouse",
        role: "WAREHOUSE_MANAGER",
        restaurant_id: 1,
        created_by_id: 2,
        is_active: true,
      },
    },
    {
      // Warehouse manager with no warehouse assigned — exercises the
      // `missing_warehouse_assignment` 409 path.
      email: "warehouse2@demo.ros",
      password: "Demo@1234",
      me: {
        id: 7,
        email: "warehouse2@demo.ros",
        full_name: "Unassigned Warehouse",
        role: "WAREHOUSE_MANAGER",
        restaurant_id: 1,
        created_by_id: 2,
        is_active: true,
      },
    },
    {
      email: "kitchen@demo.ros",
      password: "Demo@1234",
      me: {
        id: 4,
        email: "kitchen@demo.ros",
        full_name: "Casey Kitchen",
        role: "KITCHEN_MANAGER",
        restaurant_id: 1,
        created_by_id: 2,
        is_active: true,
      },
    },
    {
      email: "branch@demo.ros",
      password: "Demo@1234",
      me: {
        id: 5,
        email: "branch@demo.ros",
        full_name: "Riley Branch",
        role: "BRANCH_MANAGER",
        restaurant_id: 1,
        created_by_id: 2,
        is_active: true,
        branch_id: 1,
        capabilities: MANAGER_CAPABILITIES,
      },
    },
    {
      // A branch CHEF: BRANCH_STAFF by role, position CHEF. Routes to the
      // sub-kitchen (not the till) and skips the POS device upgrade.
      email: "chef@demo.ros",
      password: "Demo@1234",
      me: {
        id: 8,
        email: "chef@demo.ros",
        full_name: "Sam Chef",
        role: "BRANCH_STAFF",
        restaurant_id: 1,
        created_by_id: 5,
        is_active: true,
        position: "CHEF",
        branch_id: 1,
        capabilities: CHEF_CAPABILITIES,
      },
    },
    {
      email: "temp@demo.ros",
      password: "Temp@1234",
      me: {
        id: 6,
        email: "temp@demo.ros",
        full_name: "Temp User",
        role: "ADMIN",
        restaurant_id: 1,
        created_by_id: 1,
        is_active: true,
        must_change_password: true,
      },
    },
  );

  return users;
}

function invoicesForRestaurant(db: MockDb, restaurantId: string): Invoice[] {
  const restaurant = db.restaurants.find((r) => r.id === restaurantId);
  return db.invoices
    .filter((i) => i.restaurant_id === restaurantId)
    .sort((a, b) => b.issued_on.localeCompare(a.issued_on))
    .map((i) => ({
      id: String(i.id),
      amount: i.amount,
      issued_on: i.issued_on,
      paid: i.paid,
      restaurant_id: restaurantId,
      restaurant_name: restaurant?.name ?? "",
      owner_contact_email: restaurant?.admin.email ?? null,
    }));
}

function billingSummaryForRestaurant(db: MockDb, restaurant: Restaurant): BillingSummary {
  return {
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    owner_contact_email: restaurant.admin.email || null,
    plan_tier: restaurant.plan_tier,
    plan_status: restaurant.plan_status,
    plan_amount: restaurant.plan_amount ?? planAmountForTier(restaurant.plan_tier) ?? "0",
    next_billing_date:
      restaurant.next_billing_date ?? addMonths(new Date(), 1).toISOString().slice(0, 10),
    invoices: invoicesForRestaurant(db, restaurant.id),
  };
}

function seedDb(): MockDb {
  const r1: Restaurant = {
    id: "rest-001",
    name: "Demo Restaurant Group",
    plan_tier: "premium",
    plan_status: "active",
    branch_limit: 2,
    branch_count: 1,
    plan_amount: "499.00",
    next_billing_date: defaultNextBillingDate(),
    admin: {
      id: "admin-001",
      name: "Alex Rivera",
      email: "admin@demo-restaurant.ros",
      phone: "+1 555 010 2001",
      access_status: "active",
    },
    public_slug: "demo-restaurant-group",
    created_at: localCreatedAt(),
    updated_at: now(),
  };

  const r2: Restaurant = {
    id: "rest-002",
    name: "Layered Hospitality",
    plan_tier: "enterprise",
    plan_status: "halted",
    branch_limit: 25,
    branch_count: 8,
    plan_amount: "999.00",
    next_billing_date: defaultNextBillingDate(),
    admin: {
      id: "admin-002",
      name: "Jordan Lee",
      email: "admin@layered-hospitality.ros",
      phone: "+1 555 010 2002",
      access_status: "active",
    },
    created_at: localCreatedAt(),
    updated_at: now(),
  };

  const r3: Restaurant = {
    id: "rest-003",
    name: "Sunset Bistro",
    plan_tier: "standard",
    plan_status: "active",
    branch_limit: 3,
    branch_count: 2,
    plan_amount: "199.00",
    next_billing_date: defaultNextBillingDate(),
    admin: {
      id: "admin-003",
      name: "Morgan Chen",
      email: "admin@sunset-bistro.ros",
      phone: "+1 555 010 2003",
      access_status: "revoked",
    },
    created_at: localCreatedAt(),
    updated_at: now(),
  };

  const restaurants = [r1, r2, r3];

  const branches: Branch[] = [
    {
      id: "br-001",
      restaurant_id: "rest-001",
      name: "Downtown Branch",
      location: "City Center",
      created_at: now(),
    },
    /**
     * A second branch of the same restaurant. It exists so that branch scoping
     * is *demonstrable* rather than merely asserted: with one branch, a query
     * that forgot to filter looks identical to one that didn't.
     */
    {
      id: "br-002",
      restaurant_id: "rest-001",
      name: "Gulberg Branch",
      location: "Gulberg III",
      created_at: now(),
    },
  ];

  const kitchens: Kitchen[] = [
    {
      id: "kit-001",
      restaurant_id: "rest-001",
      name: "Central Kitchen",
      location: "Prep Floor",
      created_at: now(),
    },
  ];

  const warehouses: Warehouse[] = [
    {
      id: "wh-001",
      restaurant_id: "rest-001",
      name: "Main Warehouse",
      location: "Storage Block A",
      created_at: now(),
    },
  ];

  const created = now();
  const employees: MockEmployee[] = [
    {
      id: "emp-003",
      restaurant_id: "rest-001",
      email: "warehouse@demo.ros",
      full_name: "Sam Warehouse",
      role: "WAREHOUSE_MANAGER",
      is_active: true,
      warehouse_id: "wh-001",
      branch_id: null,
      kitchen_id: null,
      created_at: created,
    },
    {
      id: "emp-007",
      restaurant_id: "rest-001",
      email: "warehouse2@demo.ros",
      full_name: "Unassigned Warehouse",
      role: "WAREHOUSE_MANAGER",
      is_active: true,
      warehouse_id: null,
      branch_id: null,
      kitchen_id: null,
      created_at: created,
    },
    {
      id: "emp-004",
      restaurant_id: "rest-001",
      email: "kitchen@demo.ros",
      full_name: "Casey Kitchen",
      role: "KITCHEN_MANAGER",
      is_active: true,
      kitchen_id: "kit-001",
      branch_id: null,
      warehouse_id: null,
      created_at: created,
    },
    {
      id: "emp-005",
      restaurant_id: "rest-001",
      email: "branch@demo.ros",
      full_name: "Riley Branch",
      role: "BRANCH_MANAGER",
      is_active: true,
      branch_id: "br-001",
      kitchen_id: null,
      warehouse_id: null,
      created_at: created,
    },
    {
      // The branch CHEF — resolves the sub-kitchen endpoints to br-001.
      id: "emp-009",
      restaurant_id: "rest-001",
      email: "chef@demo.ros",
      full_name: "Sam Chef",
      role: "BRANCH_STAFF",
      position: "CHEF",
      is_active: true,
      branch_id: "br-001",
      kitchen_id: null,
      warehouse_id: null,
      created_at: created,
    },
    {
      id: "emp-008",
      restaurant_id: "rest-001",
      email: "wh-staff@demo.ros",
      full_name: "Whitney Staff",
      role: "WAREHOUSE_STAFF",
      is_active: true,
      warehouse_id: "wh-001",
      branch_id: null,
      kitchen_id: null,
      created_at: created,
    },
  ];

  const invoices: MockInvoiceRecord[] = [
    {
      id: 1,
      restaurant_id: "rest-001",
      amount: planAmountForTier("premium") ?? "499.00",
      issued_on: addMonths(new Date(), -2).toISOString().slice(0, 10),
      paid: true,
    },
    {
      id: 2,
      restaurant_id: "rest-001",
      amount: planAmountForTier("premium") ?? "499.00",
      issued_on: addMonths(new Date(), -1).toISOString().slice(0, 10),
      paid: true,
    },
    {
      id: 3,
      restaurant_id: "rest-001",
      amount: planAmountForTier("premium") ?? "499.00",
      issued_on: new Date().toISOString().slice(0, 10),
      paid: false,
    },
    {
      id: 4,
      restaurant_id: "rest-002",
      amount: planAmountForTier("enterprise") ?? "999.00",
      issued_on: addMonths(new Date(), -1).toISOString().slice(0, 10),
      paid: false,
    },
    {
      id: 5,
      restaurant_id: "rest-003",
      amount: planAmountForTier("standard") ?? "199.00",
      issued_on: addMonths(new Date(), -1).toISOString().slice(0, 10),
      paid: true,
    },
  ];

  const products: MockProduct[] = [
    {
      id: "prod-001",
      restaurant_id: "rest-001",
      name: "House Blend Coffee Beans",
      sku: "BN-COF-001",
      stock_unit: "KG",
      units_per_pack: 5,
      cost_price: "18.50",
      selling_price: null,
      category: null,
      is_available: true,
      kind: "RAW_MATERIAL",
      is_sellable: false,
    },
    {
      id: "prod-002",
      restaurant_id: "rest-001",
      name: "Tomato Sauce (Can)",
      sku: "ING-TOM-02",
      stock_unit: "EACH",
      cost_price: null,
      selling_price: null,
      category: null,
      is_available: true,
      kind: "RAW_MATERIAL",
      is_sellable: false,
    },
    {
      id: "prod-003",
      restaurant_id: "rest-001",
      name: "Mozzarella Block",
      sku: "DAI-MOZ-10",
      stock_unit: "KG",
      cost_price: "9.75",
      selling_price: null,
      category: null,
      is_available: true,
      kind: "RAW_MATERIAL",
      is_sellable: false,
    },
    {
      id: "prod-004",
      restaurant_id: "rest-001",
      name: "Paper Napkins (Pack)",
      sku: "SUP-NAP-50",
      stock_unit: "PACK",
      cost_price: null,
      selling_price: null,
      category: null,
      is_available: true,
      kind: "RAW_MATERIAL",
      is_sellable: false,
    },
    /**
     * Bought and sold untouched — neither a raw material nor kitchen-made.
     * This is the row that would be unsellable without the RESALE kind.
     */
    {
      id: "prod-005",
      restaurant_id: "rest-001",
      name: "Bottled Cola",
      sku: "BEV-COLA-33",
      stock_unit: "EACH",
      cost_price: "40.00",
      selling_price: "100.00",
      category: "Drinks",
      is_available: true,
      kind: "RESALE",
      is_sellable: true,
    },
    /** Kitchen-made. Sellable, and needs a recipe before it can be produced. */
    {
      id: "prod-006",
      restaurant_id: "rest-001",
      name: "Classic Burger",
      sku: "FG-BURG-01",
      stock_unit: "EACH",
      cost_price: null,
      selling_price: "500.00",
      category: "Mains",
      is_available: true,
      kind: "FINISHED_GOOD",
      is_sellable: true,
    },
    /**
     * A made-to-order finished good the branch never stocks — assembled fresh
     * per order in the sub-kitchen. Ships with no recipe so the "New recipe"
     * flow has something to write.
     */
    {
      id: "prod-007",
      restaurant_id: "rest-001",
      name: "Named Cake",
      sku: "FG-CAKE-01",
      stock_unit: "EACH",
      cost_price: null,
      selling_price: "1200.00",
      category: "Desserts",
      is_available: true,
      kind: "FINISHED_GOOD",
      is_sellable: true,
    },
    /**
     * A raw material that lives at the warehouse but has never been delivered to
     * the branch. The branch-scoped ingredients picker hides it by default; it
     * only surfaces under "show all products" — the exact case Fix 2 guards.
     */
    {
      id: "prod-008",
      restaurant_id: "rest-001",
      name: "Baker's Flour",
      sku: "ING-FLR-25",
      stock_unit: "KG",
      cost_price: "1.20",
      selling_price: null,
      category: null,
      is_available: true,
      kind: "RAW_MATERIAL",
      is_sellable: false,
    },
  ];

  const requestCreated = now();
  const requests: MockStockRequest[] = [
    {
      id: "req-001",
      restaurant_id: "rest-001",
      type: "BRANCH_TO_ADMIN",
      status: "PENDING",
      notes: "Need restock for weekend rush",
      from_label: "Downtown Branch",
      created_at: requestCreated,
      line_items: [
        {
          id: "li-001",
          product_id: "prod-001",
          product_name: "House Blend Coffee Beans",
          quantity_requested: 10,
        },
        {
          id: "li-002",
          product_id: "prod-003",
          product_name: "Mozzarella Block",
          quantity_requested: 6,
        },
      ],
    },
    {
      id: "req-002",
      restaurant_id: "rest-001",
      type: "BRANCH_TO_ADMIN",
      status: "PENDING",
      notes: null,
      from_label: "Downtown Branch",
      created_at: requestCreated,
      line_items: [
        {
          id: "li-003",
          product_id: "prod-002",
          product_name: "Tomato Sauce (Can)",
          quantity_requested: 24,
        },
      ],
    },
    {
      id: "req-003",
      restaurant_id: "rest-001",
      type: "BRANCH_TO_ADMIN",
      status: "APPROVED",
      notes: "Approved earlier this week",
      from_label: "Downtown Branch",
      created_at: requestCreated,
      updated_at: requestCreated,
      line_items: [
        {
          id: "li-004",
          product_id: "prod-004",
          product_name: "Paper Napkins (Pack)",
          quantity_requested: 15,
          quantity_approved: 15,
        },
      ],
    },
    {
      id: "req-004",
      restaurant_id: "rest-001",
      type: "WAREHOUSE_TO_ADMIN_PO",
      status: "PENDING",
      notes: "PO for dry goods replenishment",
      from_label: "Main Warehouse",
      created_at: requestCreated,
      // Raised by the demo warehouse manager (user id 3) from wh-001.
      requester_id: 3,
      source_location_type: "WAREHOUSE",
      source_location_id: "wh-001",
      line_items: [
        {
          id: "li-005",
          product_id: "prod-001",
          product_name: "House Blend Coffee Beans",
          quantity_requested: 40,
        },
        {
          id: "li-006",
          product_id: "prod-002",
          product_name: "Tomato Sauce (Can)",
          quantity_requested: 60,
        },
      ],
    },
    {
      id: "req-005",
      restaurant_id: "rest-001",
      type: "WAREHOUSE_TO_ADMIN_PO",
      status: "PARTIALLY_APPROVED",
      notes: "Partial for budget control",
      from_label: "Main Warehouse",
      created_at: requestCreated,
      updated_at: requestCreated,
      requester_id: 3,
      source_location_type: "WAREHOUSE",
      source_location_id: "wh-001",
      line_items: [
        {
          id: "li-007",
          product_id: "prod-003",
          product_name: "Mozzarella Block",
          quantity_requested: 20,
          quantity_approved: 12,
        },
      ],
    },
    {
      // Admin dispatched this PO; the warehouse now confirms or reports.
      id: "req-006",
      restaurant_id: "rest-001",
      type: "WAREHOUSE_TO_ADMIN_PO",
      status: "DISPATCHED",
      notes: "Dispatched by Admin, awaiting delivery",
      from_label: "Main Warehouse",
      created_at: requestCreated,
      updated_at: requestCreated,
      requester_id: 3,
      source_location_type: "WAREHOUSE",
      source_location_id: "wh-001",
      line_items: [
        {
          id: "li-008",
          product_id: "prod-004",
          product_name: "Paper Napkins (Pack)",
          quantity_requested: 100,
          quantity_approved: 100,
        },
      ],
    },
    {
      // Incoming from the kitchen: awaiting warehouse approval.
      id: "req-007",
      restaurant_id: "rest-001",
      type: "KITCHEN_TO_WAREHOUSE",
      status: "PENDING",
      notes: "Prep stock for tomorrow's service",
      from_label: "Central Kitchen",
      created_at: requestCreated,
      requester_id: 4,
      source_location_type: "KITCHEN",
      source_location_id: "kit-001",
      target_location_type: "WAREHOUSE",
      target_location_id: "wh-001",
      line_items: [
        {
          id: "li-009",
          product_id: "prod-002",
          product_name: "Tomato Sauce (Can)",
          quantity_requested: 10,
        },
      ],
    },
    {
      // Approved by the warehouse, ready to dispatch.
      id: "req-008",
      restaurant_id: "rest-001",
      type: "KITCHEN_TO_WAREHOUSE",
      status: "APPROVED",
      notes: "Cheese for the pizza line",
      from_label: "Central Kitchen",
      created_at: requestCreated,
      updated_at: requestCreated,
      requester_id: 4,
      source_location_type: "KITCHEN",
      source_location_id: "kit-001",
      target_location_type: "WAREHOUSE",
      target_location_id: "wh-001",
      line_items: [
        {
          id: "li-010",
          product_id: "prod-003",
          product_name: "Mozzarella Block",
          quantity_requested: 8,
          quantity_approved: 5,
        },
      ],
    },
    {
      // In transit: the warehouse has decremented, the kitchen is not credited
      // until it confirms. This is the kitchen's only move on this type.
      id: "req-009",
      restaurant_id: "rest-001",
      type: "KITCHEN_TO_WAREHOUSE",
      status: "DISPATCHED",
      notes: "Weekly top-up",
      from_label: "Central Kitchen",
      created_at: requestCreated,
      updated_at: requestCreated,
      requester_id: 4,
      source_location_type: "KITCHEN",
      source_location_id: "kit-001",
      target_location_type: "WAREHOUSE",
      target_location_id: "wh-001",
      line_items: [
        {
          id: "li-011",
          product_id: "prod-002",
          product_name: "Tomato Sauce (Can)",
          quantity_requested: 24,
          // Null for the whole lifecycle: this type has no partial approval.
          quantity_approved: null,
          // Recorded when the warehouse dispatched, so receiving this in-transit
          // request credits the kitchen with the real batch and expiry (matches
          // the warehouse's B-TOM-03 row) rather than one unbatched lump.
          dispatched_batches: [
            {
              batch_code: "B-TOM-03",
              expiry_date: localYmd(
                new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              ),
              quantity: 24,
            },
          ],
        },
      ],
    },
    {
      // Forwarded here by Admin — the kitchen's production queue starts at this
      // status. A request forwarded to another kitchen would be invisible.
      id: "req-010",
      restaurant_id: "rest-001",
      type: "BRANCH_TO_ADMIN",
      status: "FORWARDED_TO_KITCHEN",
      notes: "Weekend prep for the downtown branch",
      from_label: "Downtown Branch",
      created_at: requestCreated,
      updated_at: requestCreated,
      requester_id: 5,
      source_location_type: "BRANCH",
      source_location_id: "br-001",
      target_location_type: "KITCHEN",
      target_location_id: "kit-001",
      line_items: [
        {
          id: "li-012",
          product_id: "prod-001",
          product_name: "House Blend Coffee Beans",
          quantity_requested: 20,
          quantity_approved: 20,
        },
        {
          // Partially approved: the kitchen produces and allocates the approved
          // amount, and the UI must show both numbers.
          id: "li-013",
          product_id: "prod-003",
          product_name: "Mozzarella Block",
          quantity_requested: 15,
          quantity_approved: 10,
        },
      ],
    },
  ];

  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  const sales: SalesRecord[] = [
    {
      id: "sale-001",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      amount: "420.00",
      occurred_at: daysAgo(0),
      note: "Dinner service",
      created_at: daysAgo(0),
    },
    {
      id: "sale-002",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      amount: "185.50",
      occurred_at: daysAgo(1),
      note: "Lunch service",
      created_at: daysAgo(1),
    },
    {
      id: "sale-003",
      restaurant_id: "rest-001",
      branch_id: null,
      amount: "96.75",
      occurred_at: daysAgo(2),
      note: "Takeaway counter",
      created_at: daysAgo(2),
    },
    {
      id: "sale-004",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      amount: "512.20",
      occurred_at: daysAgo(5),
      note: null,
      created_at: daysAgo(5),
    },
  ];

  // Expiry dates are relative to today so the near-expiry view stays meaningful
  // as the seed ages.
  const expiryInDays = (n: number) =>
    localYmd(new Date(Date.now() + n * 24 * 60 * 60 * 1000));

  const inventory: MockInventoryItem[] = [
    {
      id: "inv-001",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: { id: "prod-001", name: "House Blend Coffee Beans", sku: "BN-COF-001" },
      quantity: 120,
      batch_code: "B-COF-07",
      expiry_date: expiryInDays(45),
      location_type: "WAREHOUSE",
      location_id: "wh-001",
    },
    {
      id: "inv-002",
      restaurant_id: "rest-001",
      product_id: "prod-002",
      product: { id: "prod-002", name: "Tomato Sauce (Can)", sku: "ING-TOM-02" },
      quantity: 64,
      batch_code: "B-TOM-03",
      expiry_date: expiryInDays(5),
      location_type: "WAREHOUSE",
      location_id: "wh-001",
    },
    {
      id: "inv-003",
      restaurant_id: "rest-001",
      product_id: "prod-003",
      product: { id: "prod-003", name: "Mozzarella Block", sku: "DAI-MOZ-10" },
      quantity: 18,
      batch_code: "B-MOZ-11",
      expiry_date: expiryInDays(2),
      location_type: "WAREHOUSE",
      location_id: "wh-001",
    },
    {
      // Unbatched, non-perishable stock: empty batch code and no expiry.
      id: "inv-004",
      restaurant_id: "rest-001",
      product_id: "prod-004",
      product: { id: "prod-004", name: "Paper Napkins (Pack)", sku: "SUP-NAP-50" },
      quantity: 300,
      batch_code: "",
      expiry_date: null,
      location_type: "WAREHOUSE",
      location_id: "wh-001",
    },
    {
      // Flour only ever lands at the warehouse — the branch has never held it, so
      // it stays out of the branch ingredients picker until "show all".
      id: "inv-005",
      restaurant_id: "rest-001",
      product_id: "prod-008",
      product: { id: "prod-008", name: "Baker's Flour", sku: "ING-FLR-25" },
      quantity: 200,
      batch_code: "B-FLR-01",
      expiry_date: expiryInDays(120),
      location_type: "WAREHOUSE",
      location_id: "wh-001",
    },
    // ---- Kitchen (Phase 4) ----
    // Two batches of the same product, so the portal's "one row per product AND
    // batch" rule is visible without setting it up by hand.
    {
      id: "inv-101",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: { id: "prod-001", name: "House Blend Coffee Beans", sku: "BN-COF-001" },
      quantity: 40,
      batch_code: "B-COF-07",
      expiry_date: expiryInDays(30),
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    {
      id: "inv-102",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: { id: "prod-001", name: "House Blend Coffee Beans", sku: "BN-COF-001" },
      quantity: 12,
      batch_code: "B-COF-08",
      expiry_date: expiryInDays(3),
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    {
      id: "inv-103",
      restaurant_id: "rest-001",
      product_id: "prod-003",
      product: { id: "prod-003", name: "Mozzarella Block", sku: "DAI-MOZ-10" },
      quantity: 25,
      batch_code: "B-MOZ-11",
      expiry_date: expiryInDays(1),
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    {
      // Unbatched: empty batch code and no expiry. Renders as "No batch".
      id: "inv-104",
      restaurant_id: "rest-001",
      product_id: "prod-004",
      product: { id: "prod-004", name: "Paper Napkins (Pack)", sku: "SUP-NAP-50" },
      quantity: 80,
      batch_code: "",
      expiry_date: null,
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    {
      id: "inv-105",
      restaurant_id: "rest-001",
      product_id: "prod-002",
      product: { id: "prod-002", name: "Tomato Sauce (Can)", sku: "ING-TOM-02" },
      quantity: 30,
      batch_code: "B-TOM-03",
      expiry_date: expiryInDays(20),
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    {
      // A FINISHED_GOOD on hand at the kitchen. Without one, "ready to dispatch"
      // and the Notify Admin picker (finished goods only) open empty — the
      // seeded kitchen otherwise holds nothing but raw components.
      id: "inv-106",
      restaurant_id: "rest-001",
      product_id: "prod-006",
      product: { id: "prod-006", name: "Classic Burger", sku: "FG-BURG-01" },
      quantity: 24,
      batch_code: "B-BURG-01",
      expiry_date: expiryInDays(2),
      location_type: "KITCHEN",
      location_id: "kit-001",
    },
    // ---- Branch (Phase 5) ----
    // The Downtown branch's own stock. Without it the branch inventory,
    // sub-kitchen, and requests pickers all open empty on a fresh demo. One row
    // sits low (napkins) so a restock request has an obvious candidate.
    {
      id: "inv-201",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: { id: "prod-001", name: "House Blend Coffee Beans", sku: "BN-COF-001" },
      quantity: 22,
      batch_code: "B-COF-07",
      expiry_date: expiryInDays(28),
      location_type: "BRANCH",
      location_id: "br-001",
    },
    {
      id: "inv-202",
      restaurant_id: "rest-001",
      product_id: "prod-003",
      product: { id: "prod-003", name: "Mozzarella Block", sku: "DAI-MOZ-10" },
      quantity: 9,
      batch_code: "B-MOZ-11",
      expiry_date: expiryInDays(4),
      location_type: "BRANCH",
      location_id: "br-001",
    },
    {
      // Running low — the branch would raise a request to top this up.
      id: "inv-203",
      restaurant_id: "rest-001",
      product_id: "prod-004",
      product: { id: "prod-004", name: "Paper Napkins (Pack)", sku: "SUP-NAP-50" },
      quantity: 12,
      batch_code: "",
      expiry_date: null,
      location_type: "BRANCH",
      location_id: "br-001",
    },
    {
      // A sub-kitchen component — cans of tomato sauce to assemble burgers.
      id: "inv-204",
      restaurant_id: "rest-001",
      product_id: "prod-002",
      product: { id: "prod-002", name: "Tomato Sauce (Can)", sku: "ING-TOM-02" },
      quantity: 40,
      batch_code: "",
      expiry_date: null,
      location_type: "BRANCH",
      location_id: "br-001",
    },
  ];

  return {
    _seed: SEED_VERSION,
    restaurants,
    invoices,
    users: seedUsers(),
    resetTokens: {},
    branches,
    kitchens,
    warehouses,
    employees,
    products,
    requests,
    sales,
    inventory,
    stock_counts: [],
    reorder_levels: [],
    waste_events: seedWasteEvents(),
    notifications: seedNotifications(),
    customers: seedCustomers(),
    kitchen_recipes: [],
    branch_orders: [],
    production_runs: [],
    production_targets: seedProductionTargets(),
    prep_tickets: seedPrepTickets(),
    sub_kitchen_recipes: seedSubKitchenRecipes(),
  };
}

/**
 * One prep recipe so the recipe-driven completion path works on a fresh demo:
 * a Classic Burger is assembled from a little Mozzarella and a can of tomato
 * sauce — raw-material components off branch stock.
 */
function seedSubKitchenRecipes(): MockSubKitchenRecipe[] {
  return [
    {
      id: "skr-001",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      product_id: 6,
      product_name: "Classic Burger",
      version: 1,
      is_active: true,
      yield_qty: 1,
      note: null,
      made_at: "BRANCH",
      components: [
        {
          component_product_id: 3,
          component_name: "Mozzarella Block",
          quantity: 0.05,
          wastage_bp: 0,
          stock_unit: "KG",
        },
        {
          component_product_id: 2,
          component_name: "Tomato Sauce (Can)",
          quantity: 1,
          wastage_bp: 0,
          stock_unit: "EACH",
        },
      ],
      created_at: now(),
    },
  ];
}

/**
 * A couple of the branch chef's own prep-ahead jobs so the sub-kitchen board
 * isn't empty on a fresh demo. ORDER-sourced tickets are created by the live POS
 * order path (no mock), so mock mode shows BATCH work only.
 */
function seedPrepTickets(): MockPrepTicket[] {
  const created = now();
  const base: Omit<
    MockPrepTicket,
    "id" | "status" | "quantity" | "note" | "priority" | "started_at"
  > = {
    restaurant_id: "rest-001",
    branch_id: "br-001",
    source: "BATCH",
    product_id: "prod-006",
    product_name: "Classic Burger",
    customization_note: null,
    order_id: null,
    order_line_id: null,
    production_run_id: null,
    recipe_id: null,
    due_at: null,
    ready_at: null,
    completed_at: null,
    cancelled_at: null,
    created_at: created,
    create_batch_code: null,
    create_expiry_date: null,
  };
  return [
    {
      ...base,
      id: "prep-001",
      status: "QUEUED",
      quantity: 8,
      note: "Lunch prep",
      priority: 1,
      started_at: null,
    },
    {
      ...base,
      id: "prep-002",
      status: "IN_PROGRESS",
      quantity: 4,
      note: "Started early",
      priority: 0,
      started_at: created,
    },
  ];
}

/** Strip the internal batch/expiry carry off a stored prep ticket. */
function toPublicPrepTicket(t: MockPrepTicket): PrepTicket {
  const { restaurant_id, create_batch_code, create_expiry_date, ...pub } = t;
  void restaurant_id;
  void create_batch_code;
  void create_expiry_date;
  return pub;
}

/** Working-queue order: highest priority, then soonest due, then oldest. */
function sortPrepTickets(a: MockPrepTicket, b: MockPrepTicket): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.due_at !== b.due_at) {
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return a.due_at.localeCompare(b.due_at);
  }
  return a.created_at.localeCompare(b.created_at);
}

const OPEN_PREP_STATUSES: PrepStatus[] = ["QUEUED", "IN_PROGRESS", "READY"];

/** Strip the internal scoping off a stored recipe. */
function toPublicSkRecipe(r: MockSubKitchenRecipe): SubKitchenRecipe {
  const { restaurant_id, branch_id, ...pub } = r;
  void restaurant_id;
  void branch_id;
  return pub;
}

/** Inclusive `YYYY-MM-DD` stats window; defaults to the last 7 days. */
function statsWindow(filters?: SubKitchenStatsFilters): { start: string; end: string } {
  const end = filters?.end ?? now().slice(0, 10);
  const start =
    filters?.start ??
    new Date(Date.parse(`${end}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
  return { start, end };
}

/**
 * Two targets for the demo kitchen: one PENDING for today (so the kitchen has
 * something to acknowledge) and one already COMPLETED yesterday (so the list
 * shows a finished row and the edit/delete guards are exercisable).
 */
/**
 * A little write-off history so the Waste & expired table isn't empty on first
 * load. A mix of ordinary waste and an expiry, across the demo warehouse.
 */
function seedWasteEvents(): MockWasteEvent[] {
  return [
    {
      id: "waste-001",
      restaurant_id: "rest-001",
      product_id: "prod-003",
      product: { id: "prod-003", name: "Mozzarella Block", sku: "DAI-MOZ-10" },
      quantity: 4,
      movement_type: "EXPIRY",
      waste_reason: "EXPIRED",
      batch_code: "B-MOZ-11",
      notes: "Past use-by on the shelf.",
      location_type: "WAREHOUSE",
      location_id: "wh-001",
      created_at: isoDaysAgo(2),
      created_by: "Warehouse Manager",
    },
    {
      id: "waste-002",
      restaurant_id: "rest-001",
      product_id: "prod-002",
      product: { id: "prod-002", name: "Tomato Sauce (Can)", sku: "ING-TOM-02" },
      quantity: 6,
      movement_type: "WASTE",
      waste_reason: "DAMAGED",
      batch_code: "B-TOM-03",
      notes: "Cans dented in transit.",
      location_type: "WAREHOUSE",
      location_id: "wh-001",
      created_at: isoDaysAgo(5),
      created_by: "Warehouse Manager",
    },
    {
      id: "waste-003",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: {
        id: "prod-001",
        name: "House Blend Coffee Beans",
        sku: "BN-COF-001",
      },
      quantity: 3,
      movement_type: "WASTE",
      waste_reason: "SPOILAGE",
      batch_code: "B-COF-07",
      notes: null,
      location_type: "WAREHOUSE",
      location_id: "wh-001",
      created_at: isoDaysAgo(9),
      created_by: "Warehouse Manager",
    },
    {
      id: "waste-101",
      restaurant_id: "rest-001",
      product_id: "prod-001",
      product: {
        id: "prod-001",
        name: "House Blend Coffee Beans",
        sku: "BN-COF-001",
      },
      quantity: 2,
      movement_type: "EXPIRY",
      waste_reason: "EXPIRED",
      batch_code: "B-COF-08",
      notes: "Opened bag past its date.",
      location_type: "KITCHEN",
      location_id: "kit-001",
      created_at: isoDaysAgo(1),
      created_by: "Kitchen Manager",
    },
    {
      id: "waste-201",
      restaurant_id: "rest-001",
      product_id: "prod-003",
      product: { id: "prod-003", name: "Mozzarella Block", sku: "DAI-MOZ-10" },
      quantity: 1,
      movement_type: "WASTE",
      waste_reason: "DAMAGED",
      batch_code: "B-MOZ-11",
      notes: "Dropped on the floor.",
      location_type: "BRANCH",
      location_id: "br-001",
      created_at: isoDaysAgo(3),
      created_by: "Branch Manager",
    },
  ];
}

function seedProductionTargets(): MockProductionTarget[] {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return [
    {
      id: "ptgt-001",
      restaurant_id: "rest-001",
      kitchen_id: "kit-001",
      kitchen_name: "Central Kitchen",
      target_date: localYmd(),
      status: "PENDING",
      note: "Weekend rush — extra mains",
      created_at: isoDaysAgo(0),
      lines: [
        // A made item (produced) plus a resale item (added for dispatch), so the
        // whole flow — including the resale half — has something to exercise.
        { id: "ptgt-001-l1", product_id: "prod-006", product_name: "Classic Burger", kind: "FINISHED_GOOD", produced: false, quantity: 80 },
        { id: "ptgt-001-l2", product_id: "prod-005", product_name: "Bottled Cola", kind: "RESALE", produced: false, quantity: 40 },
      ],
    },
    {
      id: "ptgt-002",
      restaurant_id: "rest-001",
      kitchen_id: "kit-001",
      kitchen_name: "Central Kitchen",
      target_date: localYmd(yesterday),
      status: "COMPLETED",
      note: null,
      created_at: isoDaysAgo(1),
      lines: [
        { id: "ptgt-002-l1", product_id: "prod-006", product_name: "Classic Burger", kind: "FINISHED_GOOD", produced: true, quantity: 60 },
      ],
    },
  ];
}

/** Strip the internal `restaurant_id` before a target crosses the wire. */
function toPublicTarget(t: MockProductionTarget): ProductionTarget {
  return {
    id: t.id,
    kitchen_id: t.kitchen_id,
    kitchen_name: t.kitchen_name,
    target_date: t.target_date,
    status: t.status,
    note: t.note,
    created_at: t.created_at,
    lines: t.lines.map((l) => ({ ...l })),
    allocations: t.allocations ? t.allocations.map((a) => ({ ...a })) : undefined,
  };
}

/** Newest target date first, then newest created — used by both portals' lists. */
function sortTargets(rows: MockProductionTarget[]): MockProductionTarget[] {
  return [...rows].sort(
    (a, b) =>
      b.target_date.localeCompare(a.target_date) ||
      b.created_at.localeCompare(a.created_at),
  );
}

function buildTargetLines(
  db: MockDb,
  targetId: string,
  lines: { product_id: string; quantity: number }[],
): ProductionTarget["lines"] {
  return lines.map((line, i) => {
    const product = db.products.find((p) => p.id === line.product_id);
    return {
      id: `${targetId}-l${i + 1}`,
      product_id: line.product_id,
      product_name: product?.name ?? "Unknown product",
      // A target lists sellable output; a raw material here is a mistake, but the
      // mock mirrors what the product actually is rather than inventing a kind.
      kind: product?.kind ?? "FINISHED_GOOD",
      produced: false,
      quantity: line.quantity,
    };
  });
}

function validateTargetLines(lines: { quantity: number }[]) {
  if (lines.length === 0) {
    throw new ApiError("At least one line is required.", 422);
  }
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0.", 422);
    }
  }
}

/** Find a target owned by this kitchen, or 404. Shared by every kitchen move. */
function requireMyTarget(
  db: MockDb,
  kitchen: Kitchen,
  id: string,
): MockProductionTarget {
  const found = db.production_targets.find(
    (t) => t.id === id && t.kitchen_id === kitchen.id,
  );
  if (!found) throw new ApiError("Production target not found", 404);
  return found;
}

/**
 * A branch confirming a production-target delivery. Returns the delivery row on
 * success, or null when `deliveryId` is not a target allocation (so the caller
 * falls through to the dispatch-request path). Status-only: no stock is moved —
 * the real backend credits the branch here. Mutates `db` but does not save; the
 * caller saves once.
 */
function receiveTargetDelivery(
  db: MockDb,
  branch: Branch,
  deliveryId: string,
): BranchDelivery | null {
  let owner: MockProductionTarget | undefined;
  let alloc: ProductionTargetAllocation | undefined;
  for (const target of db.production_targets) {
    if (target.restaurant_id !== branch.restaurant_id) continue;
    const match = (target.allocations ?? []).find(
      (a) => a.id === deliveryId && a.branch_id === branch.id,
    );
    if (match) {
      owner = target;
      alloc = match;
      break;
    }
  }
  if (!owner || !alloc) return null;
  if (alloc.status !== "DISPATCHED") {
    throw new ApiError(
      `This delivery is ${alloc.status.toLowerCase()}, not awaiting receipt.`,
      409,
    );
  }

  alloc.status = "RECEIVED";
  // The target is fully received only once every branch has confirmed.
  if ((owner.allocations ?? []).every((a) => a.status === "RECEIVED")) {
    owner.status = "RECEIVED";
    notifyRole(
      db,
      { restaurantId: owner.restaurant_id, role: "KITCHEN_MANAGER", kitchenId: owner.kitchen_id },
      {
        title: "Production target received",
        body: `All branches confirmed the ${owner.target_date} target.`,
        entityType: "production_target",
        entityId: owner.id,
      },
    );
  }

  return {
    id: alloc.id,
    request_id: owner.id,
    from_label: owner.kitchen_name,
    product_id: alloc.product_id ?? "",
    product_name: alloc.product_name,
    quantity: alloc.quantity,
    status: "RECEIVED",
    created_at: owner.created_at,
  };
}

/**
 * Drop a notification into the inbox of whichever user holds `role` in this
 * restaurant. Best-effort: the production-target flow drives it at each hand-off,
 * but a missing recipient must never fail the transition, so this returns
 * silently rather than throwing. The owner-admin is matched on the restaurant
 * record; everyone else on their employee record.
 */
function notifyRole(
  db: MockDb,
  opts: {
    restaurantId: string;
    role: UserRole;
    kitchenId?: string;
    branchId?: string;
  },
  message: { title: string; body: string; entityType: string; entityId: string },
): void {
  let email: string | undefined;
  if (opts.role === "ADMIN") {
    email = db.restaurants.find((r) => r.id === opts.restaurantId)?.admin.email;
  } else {
    const emp = db.employees.find(
      (e) =>
        e.restaurant_id === opts.restaurantId &&
        e.role === opts.role &&
        (opts.kitchenId ? e.kitchen_id === opts.kitchenId : true) &&
        (opts.branchId ? e.branch_id === opts.branchId : true),
    );
    email = emp?.email;
  }
  if (!email) return;
  const account = db.users.find(
    (u) => u.email.toLowerCase() === email!.toLowerCase(),
  );
  if (!account) return;
  db.notifications.push({
    id: `ntf-${Date.now()}-${db.notifications.length + 1}`,
    restaurant_id: opts.restaurantId,
    user_id: String(account.me.id),
    title: message.title,
    body: message.body,
    entity_type: message.entityType,
    entity_id: message.entityId,
    is_read: false,
    created_at: now(),
  });
}

/**
 * Two customers on br-001 and one on br-002 — the third exists specifically so
 * branch scoping is visible in the mock rather than only under test: signed in
 * at br-001 you must never see "Bilal Ahmed".
 */
function seedCustomers(): MockCustomer[] {
  return [
    {
      id: "cust-001",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      name: "Ayesha Khan",
      phone: "0300 1234567",
      created_at: isoDaysAgo(12),
      deleted_at: null,
    },
    {
      id: "cust-002",
      restaurant_id: "rest-001",
      branch_id: "br-001",
      name: "Hassan Raza",
      phone: "0321 9876543",
      created_at: isoDaysAgo(4),
      deleted_at: null,
    },
    {
      id: "cust-003",
      restaurant_id: "rest-001",
      branch_id: "br-002",
      name: "Bilal Ahmed",
      phone: "0333 5551234",
      created_at: isoDaysAgo(2),
      deleted_at: null,
    },
  ];
}

/**
 * One of each known entity_type, plus one deliberately unknown.
 *
 * The unknown row is the point: new types arrive without an API version bump, so
 * the inbox has to render one inertly rather than crash. Seeding it means that
 * path is exercised every time someone opens the bell, not only in a future
 * phase when it is too late.
 */
function seedNotifications(): MockNotification[] {
  return [
    {
      id: "ntf-001",
      restaurant_id: "rest-001",
      user_id: "3",
      title: "Low stock",
      body: "Mozzarella Block at warehouse 1 is down to 18 (limit 20). Time to request more.",
      entity_type: "product",
      entity_id: "prod-003",
      is_read: false,
      created_at: now(),
    },
    {
      id: "ntf-002",
      restaurant_id: "rest-001",
      user_id: "2",
      title: "Request status updated",
      body: "Request #6 moved from APPROVED to DISPATCHED.",
      entity_type: "request",
      entity_id: "req-006",
      is_read: false,
      created_at: now(),
    },
    {
      id: "ntf-003",
      restaurant_id: "rest-001",
      user_id: "2",
      title: "Something from a later phase",
      body: "An entity_type this build has never heard of. It must render inertly, not crash the inbox.",
      entity_type: "some_future_thing",
      entity_id: "42",
      is_read: true,
      created_at: now(),
    },
  ];
}

function loadDb(): MockDb {
  if (typeof window === "undefined") return seedDb();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const db = seedDb();
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return db;
    }
    const db = JSON.parse(raw) as MockDb;
    if (db._seed !== SEED_VERSION) {
      const fresh = seedDb();
      localStorage.setItem(DB_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return db;
  } catch {
    return seedDb();
  }
}

function saveDb(db: MockDb) {
  if (typeof window !== "undefined") {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
}

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function requireAuth(): MeResponse {
  if (typeof window === "undefined") {
    return {
      id: 1,
      email: MOCK_SUPER_ADMIN_EMAIL,
      full_name: "Super Admin",
      role: "SUPER_ADMIN",
      restaurant_id: null,
      created_by_id: null,
      is_active: true,
    };
  }
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) throw new ApiError("Unauthorized", 401);
  return JSON.parse(session) as MeResponse;
}

function filterRestaurants(list: Restaurant[], filters?: RestaurantFilters): Restaurant[] {
  let result = [...list];
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.admin.name.toLowerCase().includes(q) ||
        r.admin.email.toLowerCase().includes(q),
    );
  }
  if (filters?.plan_status && filters.plan_status !== "all") {
    result = result.filter((r) => r.plan_status === filters.plan_status);
  }
  if (filters?.access_status && filters.access_status !== "all") {
    result = result.filter((r) => r.admin.access_status === filters.access_status);
  }
  return result;
}

function computeStats(restaurants: Restaurant[]): RestaurantStats {
  const active = restaurants.filter((r) => r.plan_status === "active").length;
  const halted = restaurants.filter((r) => r.plan_status === "halted").length;
  const revoked = restaurants.filter((r) => r.admin.access_status === "revoked").length;
  return {
    total: restaurants.length,
    active_plans: active,
    halted,
    revoked,
    by_plan_status: { active, halted },
  };
}

function findRestaurant(db: MockDb, id: string): Restaurant {
  const r = db.restaurants.find((x) => x.id === id);
  if (!r) throw new ApiError("Restaurant not found", 404);
  return r;
}

function resolveMyRestaurant(db: MockDb, me: MeResponse): Restaurant {
  const r = db.restaurants.find((x) => x.admin.email === me.email);
  if (!r) throw new ApiError("Restaurant not found", 404);
  return r;
}

/**
 * Resolve the warehouse the signed-in manager is assigned to.
 *
 * Warehouse managers are not restaurant owners, so `resolveMyRestaurant` (which
 * matches on `admin.email`) never resolves for them. The assignment lives on the
 * employee record instead — `me.restaurant_id` is a number and does not map to
 * `Restaurant.id`, so it cannot be used here either.
 */
/**
 * Resolve the warehouse the signed-in user is assigned to.
 *
 * Warehouse staff are not restaurant owners, so the assignment lives on the
 * employee record rather than on `me`. Both a manager and warehouse staff
 * resolve through the same path.
 */
function resolveMyWarehouse(db: MockDb, me: MeResponse): Warehouse {
  const employee = db.employees.find(
    (e) => e.email.toLowerCase() === me.email.toLowerCase(),
  );
  const warehouse = employee?.warehouse_id
    ? db.warehouses.find((w) => w.id === employee.warehouse_id)
    : undefined;
  if (!warehouse) {
    throw new ApiError(
      "No warehouse is assigned to your account",
      409,
      MISSING_WAREHOUSE_ASSIGNMENT,
    );
  }
  return warehouse;
}

/**
 * Resolve the kitchen the signed-in user is assigned to.
 *
 * Mirrors `resolveMyWarehouse`: kitchen staff are not restaurant owners, so the
 * assignment lives on the employee record rather than on `me`. Both a manager
 * and a sub-chef resolve through the same path.
 */
function resolveMyKitchen(db: MockDb, me: MeResponse): Kitchen {
  const employee = db.employees.find(
    (e) => e.email.toLowerCase() === me.email.toLowerCase(),
  );
  const kitchen = employee?.kitchen_id
    ? db.kitchens.find((k) => k.id === employee.kitchen_id)
    : undefined;
  if (!kitchen) {
    throw new ApiError(
      "Kitchen staff must be assigned to a kitchen.",
      409,
      MISSING_KITCHEN_ASSIGNMENT,
    );
  }
  return kitchen;
}

/**
 * The manager-only endpoints. The server enforces this independently of the UI,
 * so the mock does too — a sub-chef reaching these gets the same 403 they would
 * get live, which is what makes the hidden-action gating testable.
 */
function requireKitchenManager(me: MeResponse) {
  if (me.role !== "KITCHEN_MANAGER") {
    throw new ApiError("You do not have access to this operation.", 403);
  }
}

/**
 * Warehouse staff-provisioning endpoints. The server enforces this independently
 * of the UI, so the mock does too — warehouse staff reaching these get the same
 * 403 they would get live.
 */
function requireWarehouseManager(me: MeResponse) {
  if (me.role !== "WAREHOUSE_MANAGER") {
    throw new ApiError("You do not have access to this operation.", 403);
  }
}

/**
 * Resolve the branch the signed-in user is assigned to.
 *
 * Mirrors `resolveMyKitchen`/`resolveMyWarehouse`. Both BRANCH_MANAGER and
 * BRANCH_STAFF resolve through the same path — the employee record — because
 * `/auth/me` carries no `branch_id` today. That is a real gap and it is why
 * this exists: it is the single place the frontend answers "which branch am I",
 * so when `/auth/me` grows the field, only this function changes.
 */
function resolveMyBranch(db: MockDb, me: MeResponse): Branch {
  const employee = db.employees.find((e) => e.email.toLowerCase() === me.email.toLowerCase());
  const branch = employee?.branch_id
    ? db.branches.find((b) => b.id === employee.branch_id)
    : undefined;
  if (!branch) {
    throw new ApiError("No branch is assigned to your account", 409, MISSING_BRANCH_ASSIGNMENT);
  }
  return branch;
}

/** Branch writes the counter staff may not do. The server enforces it too. */
function requireBranchManager(me: MeResponse) {
  if (me.role !== "BRANCH_MANAGER") {
    throw new ApiError("You do not have access to this operation.", 403);
  }
}

/**
 * The sub-kitchen prep station admits the branch manager (who keeps every branch
 * capability and can cover the station) and a branch CHEF (BRANCH_STAFF +
 * position CHEF) who works it day to day.
 */
function requirePrepStation(me: MeResponse) {
  const isManager = me.role === "BRANCH_MANAGER";
  const isChef = me.role === "BRANCH_STAFF" && me.position === "CHEF";
  if (!isManager && !isChef) {
    throw new ApiError("You do not have access to this operation.", 403);
  }
}

/**
 * Writes at the station — completing, batching, waste. Gated on the capability
 * rather than the role: the server gates sub-kitchen waste on `PREP_OPERATE`
 * (not `WASTE_LOG`), which both the chef and the manager hold.
 */
function requirePrepOperate(me: MeResponse) {
  requirePrepStation(me);
  if (!(me.capabilities ?? []).includes("PREP_OPERATE")) {
    throw new ApiError("You do not have access to this operation.", 403);
  }
}

/**
 * On-hand rows for one branch, shared by `/branch/inventory` and the
 * sub-kitchen's `/sub-kitchen/inventory`. One builder because they are the same
 * stock seen from two portals — if they were built separately they would drift,
 * and the chef and the manager would disagree about what's on the shelf.
 *
 * No `cost_price`: structurally absent, not nulled (`pricing-leak.test.ts`).
 */
function branchInventoryRows(db: MockDb, branchId: string): BranchInventoryItem[] {
  // Mirror the live API: one row per product + expiry, zero-quantity rows
  // dropped, `is_expired` decided server-side, sorted soonest-expiry-first.
  const today = now().slice(0, 10);
  return db.inventory
    .filter((i) => i.location_type === "BRANCH" && i.location_id === branchId && i.quantity > 0)
    .map((i) => ({
      id: i.id,
      product_id: i.product_id,
      product_name: i.product.name,
      sku: i.product.sku ?? null,
      quantity: i.quantity,
      batch_code: i.batch_code ?? "",
      expiry_date: i.expiry_date ?? null,
      is_expired: i.expiry_date != null && i.expiry_date < today,
      // Resolved from the catalog so the table can show the unit.
      stock_unit: db.products.find((p) => p.id === i.product_id)?.stock_unit ?? "EACH",
      location_id: i.location_id,
    }))
    .sort(
      (a, b) =>
        (a.expiry_date ?? "9999-12-31").localeCompare(b.expiry_date ?? "9999-12-31") ||
        a.product_name.localeCompare(b.product_name),
    );
}

function toPublicCustomer(c: MockCustomer): BranchCustomer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    branch_id: c.branch_id,
    created_at: c.created_at,
  };
}

/**
 * Find a customer **within the caller's branch**.
 *
 * 404, not 403, when it belongs to another branch — a 403 would confirm the row
 * exists, which is exactly the leak the scoping is there to close. Soft-deleted
 * customers are invisible here for the same reason they can't be attached to a
 * new order.
 */
function findMyCustomer(db: MockDb, branchId: string, id: string): MockCustomer {
  const found = db.customers.find(
    (c) => c.id === id && c.branch_id === branchId && c.deleted_at === null,
  );
  if (!found) throw new ApiError("Customer not found", 404);
  return found;
}

/** Locate one kitchen stock row by product and batch. See `findWarehouseStock`. */
function findKitchenStock(
  db: MockDb,
  kitchen: Kitchen,
  productId: string,
  batchCode?: string,
): MockInventoryItem | undefined {
  const batch = batchCode?.trim() ?? "";
  return db.inventory.find(
    (item) =>
      item.location_type === "KITCHEN" &&
      item.location_id === kitchen.id &&
      item.product_id === productId &&
      item.batch_code === batch,
  );
}

/**
 * Locate one stock row by product and batch within the caller's warehouse.
 *
 * Stock is held per product+batch, so an omitted or blank `batch_code` targets
 * the unbatched row (`batch_code: ""`) rather than the product as a whole.
 *
 * ASSUMPTION: the contract does not say whether `insufficient_stock` is judged
 * per batch or against a product's total across batches. This mock judges per
 * batch — consistent with movements carrying a `batch_code`. If the live API
 * aggregates instead, this helper is the only place that needs to change.
 */
function findWarehouseStock(
  db: MockDb,
  warehouse: Warehouse,
  productId: string,
  batchCode?: string,
): MockInventoryItem | undefined {
  const batch = batchCode?.trim() ?? "";
  return db.inventory.find(
    (item) =>
      item.location_type === "WAREHOUSE" &&
      item.location_id === warehouse.id &&
      item.product_id === productId &&
      item.batch_code === batch,
  );
}

/**
 * Stock rows for one product in this warehouse, oldest expiry first so a
 * dispatch consumes the batch closest to expiring. Unbatched/undated stock
 * sorts last.
 *
 * ASSUMPTION: a request line carries no batch code, so a dispatch has to draw
 * across batches — unlike adjust/waste, which target a single batch row. The
 * contract does not spell out the picking order; FIFO by expiry is the safe
 * default for perishables.
 */
function warehouseStockRows(
  db: MockDb,
  warehouse: Warehouse,
  productId: string,
): MockInventoryItem[] {
  return db.inventory
    .filter(
      (item) =>
        item.location_type === "WAREHOUSE" &&
        item.location_id === warehouse.id &&
        item.product_id === productId,
    )
    .sort((a, b) => {
      if (a.expiry_date && b.expiry_date) {
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      if (a.expiry_date) return -1;
      if (b.expiry_date) return 1;
      return 0;
    });
}

/**
 * Remove dispatched quantities from stock.
 *
 * Every line is checked against a running plan before anything is written, so a
 * shortfall on the last line cannot leave earlier lines already decremented.
 * The plan also keeps two lines for the same product from double-spending a row.
 */
function applyDispatchToStock(
  db: MockDb,
  warehouse: Warehouse,
  request: MockStockRequest,
): void {
  const planned = new Map<string, number>();
  // Per line, the batches it draws — captured here (not re-read after the
  // decrement) so the receiving kitchen inherits each batch's code and expiry.
  const picksByLine = new Map<string, DispatchedBatch[]>();

  for (const line of request.line_items) {
    // Falls back to the requested amount when nothing was approved.
    const needed = line.quantity_approved ?? line.quantity_requested;
    if (needed <= 0) continue;

    const rows = warehouseStockRows(db, warehouse, line.product_id ?? "");
    const available = rows.reduce(
      (sum, row) => sum + (row.quantity - (planned.get(row.id) ?? 0)),
      0,
    );
    if (available < needed) {
      throw new ApiError(
        `Only ${available} of ${line.product_name} on hand`,
        409,
        INSUFFICIENT_STOCK,
      );
    }

    let remaining = needed;
    const picks: DispatchedBatch[] = [];
    for (const row of rows) {
      if (remaining <= 0) break;
      const free = row.quantity - (planned.get(row.id) ?? 0);
      if (free <= 0) continue;
      const take = Math.min(free, remaining);
      planned.set(row.id, (planned.get(row.id) ?? 0) + take);
      picks.push({
        batch_code: row.batch_code,
        expiry_date: row.expiry_date ?? null,
        quantity: take,
      });
      remaining -= take;
    }
    picksByLine.set(line.id, picks);
  }

  for (const [rowId, quantity] of planned) {
    const row = db.inventory.find((item) => item.id === rowId);
    if (row) row.quantity -= quantity;
  }

  // Stamp each line with the batches that left the warehouse, so RECEIVED can
  // credit the kitchen batch-for-batch rather than as one unbatched pile.
  for (const line of request.line_items) {
    const picks = picksByLine.get(line.id);
    if (picks && picks.length > 0) line.dispatched_batches = picks;
  }
}

/**
 * Narrow a stored product kind to what a warehouse may own. A warehouse never
 * stocks finished goods, so anything but RAW_MATERIAL/RESALE resolves to
 * undefined rather than leaking a kitchen kind onto a warehouse row.
 */
function warehouseKind(
  kind: ProductKind | undefined,
): WarehouseProductKind | undefined {
  return kind === "RAW_MATERIAL" || kind === "RESALE" ? kind : undefined;
}

function toPublicInventoryItem(
  item: MockInventoryItem,
  db: MockDb,
): InventoryItem {
  // The row stores only {id, name, sku}; resolve the kind and unit from the
  // catalog so the warehouse inventory view can show what each product is and
  // how it is measured.
  const product = db.products.find((p) => p.id === item.product_id);
  return {
    id: item.id,
    product_id: item.product_id,
    product: {
      ...item.product,
      kind: warehouseKind(product?.kind),
      stock_unit: product?.stock_unit ?? "EACH",
      units_per_pack: product?.units_per_pack ?? null,
    },
    quantity: item.quantity,
    batch_code: item.batch_code,
    expiry_date: item.expiry_date,
    location_type: item.location_type,
    location_id: item.location_id,
  };
}

/** Strip the tenant key off a stored waste event for the public shape. */
function toPublicWasteEvent(event: MockWasteEvent): WasteEvent {
  return {
    id: event.id,
    product_id: event.product_id,
    product: event.product,
    quantity: event.quantity,
    movement_type: event.movement_type,
    waste_reason: event.waste_reason,
    batch_code: event.batch_code,
    notes: event.notes,
    location_type: event.location_type,
    location_id: event.location_id,
    created_at: event.created_at,
    created_by: event.created_by,
  };
}

/**
 * Admin projection. Callers filter to Admin-visible types first, so the
 * narrowing here is safe — a kitchen request never reaches this function.
 */
function toPublicRequest(req: MockStockRequest): StockRequest {
  return {
    id: req.id,
    type: req.type as AdminRequestType,
    status: req.status as RequestStatus,
    notes: req.notes,
    from_label: req.from_label,
    source_location_type: req.source_location_type as AdminLocationType | null | undefined,
    source_location_id: req.source_location_id,
    // The branch's chosen kitchen on a BRANCH_TO_ADMIN request — shown to Admin
    // and used to pre-select the forward picker.
    target_location_type: req.target_location_type as AdminLocationType | null | undefined,
    target_location_id: req.target_location_id,
    line_items: req.line_items,
    // Only KITCHEN_TO_ADMIN ever carries these; undefined elsewhere.
    allocations: req.allocations,
    created_at: req.created_at,
    updated_at: req.updated_at,
  };
}

/**
 * Which requests this manager may see. The two types scope differently:
 * a PO is the manager's own outgoing order, while a kitchen request is incoming
 * and belongs to whoever runs the target warehouse.
 */
function isWarehouseVisibleRequest(
  req: MockStockRequest,
  warehouse: Warehouse,
  meId: number,
): boolean {
  if (req.type === "WAREHOUSE_TO_ADMIN_PO") {
    return req.requester_id === meId;
  }
  if (req.type === "KITCHEN_TO_WAREHOUSE") {
    return (
      req.target_location_type === "WAREHOUSE" &&
      req.target_location_id === warehouse.id
    );
  }
  return false;
}

function toPublicKitchenInventoryItem(
  item: MockInventoryItem,
  db: MockDb,
): KitchenInventoryItem {
  // The row stores only {id, name, sku}; resolve the kind and unit from the
  // catalog so the kitchen inventory view can show a Category and unit for
  // stock it received.
  const product = db.products.find((p) => p.id === item.product_id);
  return {
    id: item.id,
    product_id: item.product_id,
    // Note the absence of cost_price: procurement cost is Admin-only, and the
    // field is missing from the projection rather than hidden at render time.
    product: { ...item.product, kind: product?.kind, stock_unit: product?.stock_unit ?? "EACH", units_per_pack: product?.units_per_pack ?? null },
    quantity: item.quantity,
    batch_code: item.batch_code,
    expiry_date: item.expiry_date,
    // Carried through, not hardcoded: this projection also serves the kitchen's
    // read-only view of WAREHOUSE stock.
    location_type: item.location_type,
    location_id: item.location_id,
  };
}

function toPublicStockCount(count: MockStockCount): KitchenStockCount {
  return {
    id: count.id,
    location_type: count.location_type,
    location_id: count.location_id,
    counted_by_id: count.counted_by_id,
    notes: count.notes,
    created_at: count.created_at,
    lines: count.lines,
  };
}

/**
 * Kitchen projection of a stored request.
 *
 * Only ever called for requests already filtered to kitchen-visible ones, so the
 * narrowing is safe: a warehouse PO never reaches it.
 */
function toPublicKitchenRequest(req: MockStockRequest, db: MockDb): KitchenRequest {
  return {
    id: req.id,
    restaurant_id: req.restaurant_id,
    request_type: req.type as KitchenRequestType,
    status: req.status as KitchenRequestStatus,
    requester_id: req.requester_id != null ? String(req.requester_id) : null,
    assignee_id: req.assignee_id != null ? String(req.assignee_id) : null,
    source_location_type: req.source_location_type ?? null,
    source_location_id: req.source_location_id ?? null,
    target_location_type: req.target_location_type ?? null,
    target_location_id: req.target_location_id ?? null,
    notes: req.notes,
    created_at: req.created_at,
    updated_at: req.updated_at,
    line_items: req.line_items.map((line) => ({
      id: line.id,
      product_id: line.product_id ?? "",
      product_name: line.product_name,
      quantity_requested: line.quantity_requested,
      quantity_approved: line.quantity_approved ?? null,
      produced: Boolean(line.produced),
      // The line's product decides made-vs-resale for the kitchen's checklist.
      kind: db.products.find((p) => p.id === line.product_id)?.kind ?? "FINISHED_GOOD",
    })),
    // Only a dispatch request carries these — the per-branch split the kitchen
    // dispatches against.
    allocations: req.allocations,
  };
}

/**
 * Both kitchen inboxes page and filter identically; only the predicate differs.
 * Newest first, matching the live API.
 */
function paginateKitchenRequests(
  source: MockStockRequest[],
  db: MockDb,
  filters?: KitchenRequestFilters,
): Paginated<KitchenRequest> {
  const page = filters?.page ?? 1;
  const page_size = filters?.page_size ?? 20;

  const all = source
    .filter(
      (r) =>
        !filters?.status ||
        filters.status === "all" ||
        r.status === filters.status,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const start = (page - 1) * page_size;
  return {
    items: all.slice(start, start + page_size).map((r) => toPublicKitchenRequest(r, db)),
    page,
    page_size,
    total: all.length,
  };
}

/**
 * A request this kitchen may see: its own warehouse requests, or a branch
 * request Admin forwarded here. Anything else — another kitchen's work, a
 * warehouse PO — is a 404 rather than a 403, so the UI cannot tell "not yours"
 * from "does not exist".
 */
function findKitchenVisibleRequest(
  db: MockDb,
  kitchen: Kitchen,
  requestId: string,
): MockStockRequest {
  const found = db.requests.find(
    (r) => r.id === requestId && r.restaurant_id === kitchen.restaurant_id,
  );
  if (!found) throw new ApiError("Request not found", 404);

  const isMyWarehouseRequest =
    found.type === "KITCHEN_TO_WAREHOUSE" && found.source_location_id === kitchen.id;
  const isForwardedToMe =
    found.type === "BRANCH_TO_ADMIN" &&
    found.target_location_type === "KITCHEN" &&
    found.target_location_id === kitchen.id;
  const isMyDispatch =
    found.type === "KITCHEN_TO_ADMIN" && found.source_location_id === kitchen.id;

  if (!isMyWarehouseRequest && !isForwardedToMe && !isMyDispatch) {
    throw new ApiError("Request not found", 404);
  }
  return found;
}

/**
 * Every kitchen row holding this product, soonest-expiring first. Unbatched and
 * no-expiry rows sort last — they are the ones with no deadline to beat.
 */
function kitchenStockForProduct(
  db: MockDb,
  kitchen: Kitchen,
  productId: string,
): MockInventoryItem[] {
  return db.inventory
    .filter(
      (item) =>
        item.location_type === "KITCHEN" &&
        item.location_id === kitchen.id &&
        item.product_id === productId &&
        item.quantity > 0,
    )
    .sort((a, b) => (a.expiry_date ?? "9999-12-31").localeCompare(b.expiry_date ?? "9999-12-31"));
}

/**
 * ALLOCATED ships the approved quantities out of the kitchen.
 *
 * ASSUMPTION: a request line names a product but no batch, so this draws across
 * batches, soonest-expiring first. Judging it per batch (the way waste does,
 * where the caller picks the batch) would fail against stock that plainly
 * exists. If the live API allocates differently — a single batch, or newest
 * first — this function is the only place that needs to change.
 */
function applyAllocationToKitchenStock(
  db: MockDb,
  kitchen: Kitchen,
  req: MockStockRequest,
) {
  // Check every line before mutating any: a partial write would leave the
  // status un-moved but the stock already spent.
  const debits = req.line_items.map((line) => {
    const quantity = line.quantity_approved ?? line.quantity_requested;
    const rows = kitchenStockForProduct(db, kitchen, line.product_id ?? "");
    const onHand = rows.reduce((sum, item) => sum + item.quantity, 0);
    if (onHand < quantity) {
      throw new ApiError(
        `Only ${onHand} of ${line.product_name} on hand; ${quantity} needed.`,
        409,
        INSUFFICIENT_STOCK,
      );
    }
    return { rows, quantity };
  });

  for (const { rows, quantity } of debits) {
    let remaining = quantity;
    for (const item of rows) {
      if (remaining === 0) break;
      const taken = Math.min(item.quantity, remaining);
      item.quantity -= taken;
      remaining -= taken;
    }
  }
}

/**
 * A branch confirming a kitchen delivery credits its own stock. Unbatched, like
 * the sub-kitchen and branch-order credits — the branch tracks finished goods by
 * product, not batch.
 */
function applyDeliveryToBranchStock(
  db: MockDb,
  branch: Branch,
  productId: string,
  productName: string,
  quantity: number,
) {
  const existing = db.inventory.find(
    (i) =>
      i.location_type === "BRANCH" &&
      i.location_id === branch.id &&
      i.product_id === productId &&
      i.batch_code === "",
  );
  if (existing) {
    existing.quantity += quantity;
    return;
  }
  const product = db.products.find((p) => p.id === productId);
  db.inventory.push({
    id: `inv-${Date.now()}-${productId}`,
    restaurant_id: branch.restaurant_id,
    product_id: productId,
    product: { id: productId, name: product?.name ?? productName, sku: product?.sku },
    quantity,
    batch_code: "",
    expiry_date: null,
    location_type: "BRANCH",
    location_id: branch.id,
  });
}

/** RECEIVED credits the kitchen with what the warehouse dispatched. */
function applyKitchenReceiptToStock(
  db: MockDb,
  kitchen: Kitchen,
  req: MockStockRequest,
) {
  for (const line of req.line_items) {
    const productId = line.product_id ?? "";
    const product = db.products.find((p) => p.id === productId);
    // Credit each batch the warehouse actually dispatched so the kitchen row
    // inherits its code and expiry. Fall back to one unbatched lump for legacy
    // requests dispatched before batches were tracked on the line.
    const batches: DispatchedBatch[] = line.dispatched_batches?.length
      ? line.dispatched_batches
      : [
          {
            batch_code: "",
            expiry_date: null,
            quantity: line.quantity_approved ?? line.quantity_requested,
          },
        ];
    for (const batch of batches) {
      if (batch.quantity <= 0) continue;
      const existing = findKitchenStock(db, kitchen, productId, batch.batch_code);
      if (existing) {
        existing.quantity += batch.quantity;
        // A later dispatch of the same batch may carry a corrected expiry.
        if (batch.expiry_date) existing.expiry_date = batch.expiry_date;
        continue;
      }
      db.inventory.push({
        id: `inv-${Date.now()}-${productId}-${batch.batch_code}`,
        restaurant_id: kitchen.restaurant_id,
        product_id: productId,
        product: {
          id: productId,
          name: product?.name ?? line.product_name,
          sku: product?.sku,
        },
        quantity: batch.quantity,
        batch_code: batch.batch_code,
        expiry_date: batch.expiry_date ?? null,
        location_type: "KITCHEN",
        location_id: kitchen.id,
      });
    }
  }
}

/** Upsert a low-stock limit for one product at the caller's warehouse. */
function upsertReorderLevel(
  db: MockDb,
  warehouse: Warehouse,
  productId: string,
  level: number,
) {
  const existing = db.reorder_levels.find(
    (r) =>
      r.product_id === productId &&
      r.location_type === "WAREHOUSE" &&
      r.location_id === warehouse.id,
  );
  if (existing) {
    existing.reorder_level = level;
    return;
  }
  db.reorder_levels.push({
    restaurant_id: warehouse.restaurant_id,
    product_id: productId,
    location_type: "WAREHOUSE",
    location_id: warehouse.id,
    reorder_level: level,
  });
}

/**
 * Apply a PO's line receipts, for RECEIVED or REPORTED.
 *
 * The rules this encodes, all from the Phase 4.1 contract:
 *  - receipts are mandatory on both moves (`missing_line_receipts`)
 *  - `quantity_received` may never exceed `quantity_approved`
 *  - a report where nothing differs and no note was written is not a report
 *  - REPORTED records the shortfall and credits NOTHING
 *  - RECEIVED credits stock exactly once, and `quantity_received` is the
 *    CUMULATIVE total for the PO — on the re-enqueue path the warehouse confirms
 *    100, not the 20 that just turned up, so crediting the delta would be wrong
 *    and crediting the total twice would double-book.
 */
function applyPoReceipts(
  db: MockDb,
  warehouse: Warehouse,
  req: MockStockRequest,
  body: UpdateWarehouseRequestStatusInput,
) {
  const receipts = body.line_receipts ?? [];
  if (receipts.length === 0) {
    throw new ApiError(
      "Line receipts are required to receive or report this order.",
      409,
      MISSING_LINE_RECEIPTS,
    );
  }

  // Validate everything before mutating: a half-applied receipt would leave the
  // status un-moved but stock already booked.
  const applied = receipts.map((receipt) => {
    const line = req.line_items.find((item) => item.id === receipt.line_item_id);
    if (!line) throw new ApiError("Line item not found", 404);

    const received = Number(receipt.quantity_received);
    if (!Number.isInteger(received) || received < 0) {
      throw new ApiError(
        "Received quantity must be 0 or greater",
        409,
        INVALID_RECEIVED_QUANTITY,
      );
    }

    // The approved quantity is the cap for the whole order.
    const cap = line.quantity_approved ?? line.quantity_requested;
    if (received > cap) {
      throw new ApiError(
        `Cannot receive ${received} of ${line.product_name}; only ${cap} was approved.`,
        409,
        INVALID_RECEIVED_QUANTITY,
      );
    }
    return { line, receipt, received, cap };
  });

  if (body.to_status === "REPORTED") {
    const somethingDiffers = applied.some(
      ({ received, cap, receipt }) =>
        received !== cap || Boolean(receipt.issue_note?.trim()),
    );
    if (!somethingDiffers) {
      throw new ApiError(
        "Nothing differs from the order and no issue was described.",
        409,
        NOTHING_REPORTED,
      );
    }
  }

  for (const { line, receipt, received } of applied) {
    line.quantity_received = received;
    if (receipt.issue_note !== undefined) {
      line.issue_note = receipt.issue_note ?? null;
    }
  }

  // REPORTED records only. Stock enters the ledger once, at RECEIVED.
  if (body.to_status !== "RECEIVED") return;

  for (const { line, receipt, received } of applied) {
    if (received === 0) continue;
    const productId = line.product_id ?? "";
    const batch = receipt.batch_code?.trim() ?? "";
    const existing = findWarehouseStock(db, warehouse, productId, batch);
    if (existing) {
      existing.quantity += received;
      if (receipt.expiry_date) existing.expiry_date = receipt.expiry_date;
      continue;
    }
    const product = db.products.find((p) => p.id === productId);
    db.inventory.push({
      id: `inv-${Date.now()}-${productId}-${batch}`,
      restaurant_id: warehouse.restaurant_id,
      product_id: productId,
      product: {
        id: productId,
        name: product?.name ?? line.product_name,
        sku: product?.sku,
      },
      quantity: received,
      batch_code: batch,
      expiry_date: receipt.expiry_date?.trim() || null,
      location_type: "WAREHOUSE",
      location_id: warehouse.id,
    });
  }
}

/**
 * Warehouse projection of a stored request.
 *
 * Only ever called for requests already filtered to warehouse-visible types, so
 * the type/status narrowing below is safe: Admin-only values such as REJECTED or
 * FORWARDED_TO_KITCHEN never reach it.
 */
function toPublicWarehouseRequest(req: MockStockRequest): WarehouseRequest {
  return {
    id: req.id,
    restaurant_id: req.restaurant_id,
    request_type: req.type as WarehouseRequestType,
    status: req.status as WarehouseRequestStatus,
    requester_id: req.requester_id != null ? String(req.requester_id) : null,
    assignee_id: req.assignee_id != null ? String(req.assignee_id) : null,
    source_location_type: req.source_location_type ?? null,
    source_location_id: req.source_location_id ?? null,
    target_location_type: req.target_location_type ?? null,
    target_location_id: req.target_location_id ?? null,
    notes: req.notes,
    created_at: req.created_at,
    updated_at: req.updated_at,
    line_items: req.line_items.map((line) => ({
      id: line.id,
      product_id: line.product_id ?? "",
      product_name: line.product_name,
      quantity_requested: line.quantity_requested,
      quantity_approved: line.quantity_approved ?? null,
    })),
  };
}

/**
 * `type` widens to MockRequestType so Admin's read-only kitchen oversight can
 * page KITCHEN_TO_WAREHOUSE rows. Filtering by type first is also what keeps a
 * `?status=DISPATCHED` query from crossing the two vocabularies.
 */
function paginateRequests(
  db: MockDb,
  restaurantId: string,
  type: MockRequestType,
  filters?: RequestFilters,
): Paginated<StockRequest> {
  const page = filters?.page ?? 1;
  const page_size = filters?.page_size ?? 20;
  let rows = db.requests.filter((req) => req.restaurant_id === restaurantId && req.type === type);
  if (filters?.status && filters.status !== "all") {
    rows = rows.filter((req) => req.status === filters.status);
  }
  const start = (page - 1) * page_size;
  return {
    items: rows.slice(start, start + page_size).map(toPublicRequest),
    page,
    page_size,
    total: rows.length,
  };
}

function findUser(db: MockDb, email: string): MockUserAccount | undefined {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

/**
 * Whether an email is already used by any user account OR any roster employee.
 * Roster staff (e.g. kitchen personnel records) are not in `db.users`, so a
 * uniqueness check that only looked at accounts would miss them.
 */
function emailTaken(db: MockDb, email: string): boolean {
  const lower = email.toLowerCase();
  return (
    db.users.some((u) => u.email.toLowerCase() === lower) ||
    db.employees.some((e) => e.email.toLowerCase() === lower)
  );
}

/** Next `emp-N` sequence, unique across roster employees and user accounts. */
function nextEmployeeSeq(db: MockDb): number {
  const empNums = db.employees
    .map((e) => /^emp-(\d+)$/.exec(e.id)?.[1])
    .filter((n): n is string => Boolean(n))
    .map(Number);
  const userNums = db.users.map((u) => (typeof u.me.id === "number" ? u.me.id : 0));
  return Math.max(0, ...empNums, ...userNums) + 1;
}

function salesBucketStart(iso: string, period: SalesPeriod): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  if (period === "monthly") {
    d.setUTCDate(1);
  } else if (period === "weekly") {
    const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
    const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
    d.setUTCDate(d.getUTCDate() + diff);
  }
  return d.toISOString();
}

function toEmployeeOut(e: MockEmployee): Employee {
  return {
    id: e.id,
    email: e.email,
    full_name: e.full_name,
    role: e.role,
    is_active: e.is_active,
    branch_id: e.branch_id,
    kitchen_id: e.kitchen_id,
    warehouse_id: e.warehouse_id,
    job_title: e.job_title ?? null,
    phone_number: e.phone_number ?? null,
    address: e.address ?? null,
    image_url: e.image_url ?? null,
    cnic_front_url: e.cnic_front_url ?? null,
    cnic_back_url: e.cnic_back_url ?? null,
    created_at: e.created_at,
  };
}

function setSession(me: MeResponse) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(me));
  }
}

function issueTokens(me: MeResponse): TokenResponse {
  const tokens_: TokenResponse = {
    access_token: `mock-access-${me.role.toLowerCase()}`,
    refresh_token: "mock-refresh-token",
    token_type: "bearer",
  };
  tokens.set(tokens_.access_token, tokens_.refresh_token);
  setSession(me);
  return tokens_;
}

export const mockClient: ApiClient = {
  async login(email, password) {
    const db = loadDb();
    const user = findUser(db, email);
    if (!user || user.password !== password) {
      throw new ApiError("Invalid email or password", 401);
    }
    if (user.me.is_active === false) {
      throw new ApiError("This account has been deactivated", 401);
    }
    return delay(issueTokens({ ...user.me }));
  },

  async me() {
    return delay(requireAuth());
  },

  async logout() {
    tokens.clear();
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    return delay(undefined);
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const db = loadDb();
    const user = findUser(db, input.email);
    if (user) {
      const token = `reset-${Date.now()}`;
      db.resetTokens[token] = {
        email: user.email,
        expires: Date.now() + 60 * 60 * 1000,
      };
      saveDb(db);
      if (typeof window !== "undefined") {
        console.info("[mock] Password reset token:", token);
      }
    }
    return delay(undefined);
  },

  async resetPassword(input: ResetPasswordInput) {
    const db = loadDb();
    const entry = db.resetTokens[input.token];
    if (!entry || entry.expires < Date.now()) {
      throw new ApiError("Invalid or expired reset token", 400);
    }
    const user = findUser(db, entry.email);
    if (!user) throw new ApiError("User not found", 404);
    user.password = input.password;
    user.me = { ...user.me, must_change_password: false };
    delete db.resetTokens[input.token];
    saveDb(db);
    return delay(undefined);
  },

  async changePassword(input: ChangePasswordInput) {
    const me = requireAuth();
    const db = loadDb();
    const user = findUser(db, me.email);
    if (!user || user.password !== input.current_password) {
      throw new ApiError("Current password is incorrect", 400);
    }
    user.password = input.new_password;
    user.me = { ...user.me, must_change_password: false };
    saveDb(db);
    setSession(user.me);
    return delay(undefined);
  },

  async listRestaurants(filters) {
    requireAuth();
    const db = loadDb();
    return delay(filterRestaurants(db.restaurants, filters));
  },

  async getRestaurant(id) {
    requireAuth();
    const db = loadDb();
    return delay(findRestaurant(db, id));
  },

  async getRestaurantStats() {
    requireAuth();
    const db = loadDb();
    return delay(computeStats(db.restaurants));
  },

  async createRestaurant(body: CreateRestaurantInput) {
    requireAuth();
    const db = loadDb();
    const slug = slugify(body.name);
    const id = `rest-${Date.now()}`;
    const adminId = `admin-${Date.now()}`;
    const tempPassword = randomPassword();
    const adminEmail = `admin+${slug}@tenant.ros`;

    const tier = body.plan_tier ?? "standard";
    const amount =
      body.plan_amount != null ? String(body.plan_amount) : planAmountForTier(tier) ?? "199.00";
    const nextBilling = defaultNextBillingDate();
    const today = todayBillingDate();

    const restaurant: Restaurant = {
      id,
      name: body.name,
      plan_tier: tier,
      plan_status: "active",
      branch_limit: body.branch_limit ?? planByTier(tier)?.branchLimit ?? 1,
      branch_count: body.branch_limit ?? 1,
      plan_amount: amount,
      next_billing_date: nextBilling,
      admin: {
        id: adminId,
        name: body.owner_name ?? "",
        email: body.owner_email || adminEmail,
        phone: body.owner_phone ?? "",
        access_status: "active",
      },
      public_slug: slug,
      created_at: localCreatedAt(),
      updated_at: now(),
    };

    db.restaurants.push(restaurant);

    if (body.payment_received === true) {
      let nextInvoiceId = db.invoices.reduce((max, i) => Math.max(max, i.id), 0);
      nextInvoiceId += 1;
      db.invoices.push({
        id: nextInvoiceId,
        restaurant_id: id,
        amount,
        issued_on: today,
        paid: true,
      });
      nextInvoiceId += 1;
      db.invoices.push({
        id: nextInvoiceId,
        restaurant_id: id,
        amount,
        issued_on: nextBilling,
        paid: false,
      });
    }

    saveDb(db);

    const result: CreateRestaurantResult = {
      restaurant,
      admin_email: restaurant.admin.email,
      credential_email_sent: true,
      temporary_password: tempPassword,
    };
    return delay(result, 400);
  },

  async updateRestaurant(id, body) {
    requireAuth();
    const db = loadDb();
    const idx = db.restaurants.findIndex((r) => r.id === id);
    if (idx === -1) throw new ApiError("Restaurant not found", 404);

    const current = db.restaurants[idx];
    if (body.branch_limit !== undefined && body.branch_limit < current.branch_count) {
      throw new ApiError(
        `Branch limit cannot be below current branch count (${current.branch_count})`,
        400,
      );
    }

    const updated: Restaurant = {
      ...current,
      name: body.name ?? current.name,
      plan_tier: body.plan_tier ?? current.plan_tier,
      branch_limit: body.branch_limit ?? current.branch_limit,
      admin: {
        ...current.admin,
        name: body.owner_name ?? current.admin.name,
        email: body.owner_email ?? current.admin.email,
        phone: body.owner_phone ?? current.admin.phone,
      },
      updated_at: now(),
    };
    db.restaurants[idx] = updated;
    saveDb(db);
    return delay(updated);
  },

  async deleteRestaurant(id) {
    requireAuth();
    const db = loadDb();
    const before = db.restaurants.length;
    db.restaurants = db.restaurants.filter((r) => r.id !== id);
    db.invoices = db.invoices.filter((i) => i.restaurant_id !== id);
    if (db.restaurants.length === before) throw new ApiError("Restaurant not found", 404);
    saveDb(db);
    return delay(undefined);
  },

  async haltPlan(id) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, id);
    if (r.plan_status === "halted") throw new ApiError("Plan is already halted", 400);
    r.plan_status = "halted";
    r.updated_at = now();
    saveDb(db);
    return delay({ ...r });
  },

  async activatePlan(id) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, id);
    if (r.plan_status === "active") throw new ApiError("Plan is already active", 400);
    if (r.admin.access_status === "revoked") {
      throw new ApiError("Cannot activate plan while admin access is revoked", 403);
    }
    r.plan_status = "active";
    r.updated_at = now();
    saveDb(db);
    return delay({ ...r });
  },

  async revokeAdminAccess(restaurantId) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, restaurantId);
    if (r.admin.access_status === "revoked") {
      throw new ApiError("Admin access is already revoked", 400);
    }
    r.admin.access_status = "revoked";
    r.updated_at = now();
    saveDb(db);
    return delay({ ...r });
  },

  async restoreAdminAccess(restaurantId) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, restaurantId);
    if (r.admin.access_status === "active") {
      throw new ApiError("Admin access is already active", 400);
    }
    r.admin.access_status = "active";
    r.updated_at = now();
    saveDb(db);
    return delay({ ...r });
  },

  async getBilling(restaurantId) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, restaurantId);
    return delay(billingSummaryForRestaurant(db, r));
  },

  async getMyBilling() {
    const me = requireAuth();
    const db = loadDb();
    const restaurant = db.restaurants.find((r) => r.admin.email === me.email);
    if (!restaurant) throw new ApiError("Restaurant not found", 404);
    return delay(billingSummaryForRestaurant(db, restaurant));
  },

  async getMyRestaurant() {
    const me = requireAuth();
    const db = loadDb();
    const restaurant = db.restaurants.find((r) => r.admin.email === me.email);
    if (!restaurant) throw new ApiError("Restaurant not found", 404);
    return delay(restaurant);
  },

  async updateMyRestaurant(body: UpdateAdminRestaurantInput) {
    const me = requireAuth();
    const db = loadDb();
    const restaurant = db.restaurants.find((r) => r.admin.email === me.email);
    if (!restaurant) throw new ApiError("Restaurant not found", 404);

    if (body.name !== undefined) restaurant.name = body.name.trim();
    if (body.owner_name !== undefined) restaurant.admin.name = body.owner_name.trim();
    if (body.owner_phone !== undefined) restaurant.admin.phone = body.owner_phone;
    if (body.address !== undefined) restaurant.address = body.address || null;
    if (body.logo_url !== undefined) restaurant.logo_url = body.logo_url || null;

    // Changing the contact email would orphan the email-based lookup above, so
    // keep the account + session in sync — mirrors updateAdminSettings.
    if (body.owner_email !== undefined && body.owner_email !== restaurant.admin.email) {
      const account = findUser(db, me.email);
      restaurant.admin.email = body.owner_email;
      if (account) {
        account.me = { ...account.me, email: body.owner_email };
        setSession(account.me);
      }
    }

    restaurant.updated_at = now();
    saveDb(db);
    return delay(restaurant);
  },

  async uploadRestaurantLogo(file: File) {
    requireAuth();
    // No object storage in the mock — inline the image as a data URL so the
    // preview and persisted logo_url round-trip without a backend.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError("Could not read file", 400));
      reader.readAsDataURL(file);
    });
    return delay(dataUrl);
  },

  async runBillingCycle() {
    requireAuth();
    const db = loadDb();
    const today = todayBillingDate();
    let generated = 0;
    let nextId = db.invoices.reduce((max, i) => Math.max(max, i.id), 0);

    for (const r of db.restaurants) {
      if (r.plan_status !== "active") continue;
      const due = r.next_billing_date;
      const amount = r.plan_amount ?? planAmountForTier(r.plan_tier);
      if (!due || !amount) continue;
      if (due > today) continue;

      nextId += 1;
      db.invoices.push({
        id: nextId,
        restaurant_id: r.id,
        amount: String(amount),
        issued_on: due,
        paid: false,
      });
      r.next_billing_date = addOneBillingMonth(due);
      r.updated_at = now();
      generated += 1;
    }

    saveDb(db);
    return delay({ generated });
  },

  async recordRestaurantPayment(restaurantId) {
    requireAuth();
    const db = loadDb();
    const r = findRestaurant(db, restaurantId);
    const existing = db.invoices.filter((i) => i.restaurant_id === restaurantId);
    if (existing.length > 0) {
      throw new ApiError("Signup invoices already exist", 409, "conflict");
    }
    const amount = r.plan_amount ?? planAmountForTier(r.plan_tier) ?? "199.00";
    const nextBilling = r.next_billing_date ?? defaultNextBillingDate();
    const today = todayBillingDate();
    let nextId = db.invoices.reduce((max, i) => Math.max(max, i.id), 0);
    nextId += 1;
    db.invoices.push({
      id: nextId,
      restaurant_id: restaurantId,
      amount: String(amount),
      issued_on: today,
      paid: true,
    });
    nextId += 1;
    db.invoices.push({
      id: nextId,
      restaurant_id: restaurantId,
      amount: String(amount),
      issued_on: nextBilling,
      paid: false,
    });
    r.next_billing_date = nextBilling;
    r.updated_at = now();
    saveDb(db);
    return mockClient.getBilling(restaurantId);
  },

  async updateInvoice(restaurantId, invoiceId, body) {
    requireAuth();
    const db = loadDb();
    const inv = db.invoices.find(
      (i) => i.restaurant_id === restaurantId && String(i.id) === String(invoiceId),
    );
    if (!inv) throw new ApiError("Invoice not found", 404);
    const wasPaid = inv.paid;
    inv.paid = body.paid;

    if (!wasPaid && body.paid) {
      const r = findRestaurant(db, restaurantId);
      const amount = inv.amount;
      const nextIssued = addOneBillingMonth(inv.issued_on);
      const nextId = db.invoices.reduce((max, i) => Math.max(max, i.id), 0) + 1;
      db.invoices.push({
        id: nextId,
        restaurant_id: restaurantId,
        amount,
        issued_on: nextIssued,
        paid: false,
      });
      r.next_billing_date = nextIssued;
      r.updated_at = now();
    }

    saveDb(db);
    const r = findRestaurant(db, restaurantId);
    return delay({
      id: String(inv.id),
      amount: inv.amount,
      issued_on: inv.issued_on,
      paid: inv.paid,
      restaurant_id: restaurantId,
      restaurant_name: r.name,
      owner_contact_email: r.admin.email || null,
    });
  },

  async listInvoices(restaurantId) {
    requireAuth();
    const db = loadDb();
    findRestaurant(db, restaurantId);
    return delay(invoicesForRestaurant(db, restaurantId));
  },

  async shareInvoice() {
    throw new ApiError("Invoice sharing is not available", 501);
  },

  async unshareInvoice() {
    throw new ApiError("Invoice sharing is not available", 501);
  },

  async getIncomeSummary(filter) {
    requireAuth();
    if (!("month" in filter) && (!filter.from_date || !filter.to_date)) {
      throw new ApiError("Provide month or from_date and to_date", 409);
    }
    const db = loadDb();
    return delay(buildMockIncomeSummary(db.restaurants, db.invoices, filter));
  },

  async getIncomeForecast(horizon) {
    requireAuth();
    if (horizon !== 1 && horizon !== 6 && horizon !== 12) {
      throw new ApiError("horizon must be 1, 6, or 12", 409);
    }
    const db = loadDb();
    return delay(buildMockIncomeForecast(db.restaurants, horizon));
  },

  async downloadIncomeCsv(filter) {
    requireAuth();
    if (!("month" in filter) && (!filter.from_date || !filter.to_date)) {
      throw new ApiError("Provide month or from_date and to_date", 409);
    }
    const db = loadDb();
    const summary = buildMockIncomeSummary(db.restaurants, db.invoices, filter);
    const forecast6 = buildMockIncomeForecast(db.restaurants, 6);
    return delay(buildMockIncomeCsv(summary, forecast6, db.restaurants, db.invoices));
  },



  async listBranches() {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(db.branches.filter((b) => b.restaurant_id === r.id));
  },

  async createBranch(body: CreateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const count = db.branches.filter((b) => b.restaurant_id === r.id).length;
    if (count >= r.branch_limit) {
      throw new ApiError("Branch limit reached for your plan", 409, "branch_limit_reached");
    }
    const branch: Branch = {
      id: `br-${Date.now()}`,
      restaurant_id: r.id,
      name: body.name,
      location: body.location ?? null,
      created_at: now(),
    };
    db.branches.push(branch);
    r.branch_count = count + 1;
    saveDb(db);
    return delay(branch);
  },

  async updateBranch(id: string, body: UpdateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const branch = db.branches.find((b) => b.id === id && b.restaurant_id === r.id);
    if (!branch) throw new ApiError("Branch not found", 404);
    if (body.name !== undefined) branch.name = body.name;
    if (body.location !== undefined) branch.location = body.location;
    saveDb(db);
    return delay({ ...branch });
  },

  async deleteBranch(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const exists = db.branches.some((b) => b.id === id && b.restaurant_id === r.id);
    if (!exists) throw new ApiError("Branch not found", 404);
    db.branches = db.branches.filter((b) => b.id !== id);
    r.branch_count = Math.max(0, r.branch_count - 1);
    saveDb(db);
    return delay(undefined);
  },

  async listKitchens() {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(db.kitchens.filter((k) => k.restaurant_id === r.id));
  },

  async createKitchen(body: CreateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const kitchen: Kitchen = {
      id: `kit-${Date.now()}`,
      restaurant_id: r.id,
      name: body.name,
      location: body.location ?? null,
      created_at: now(),
    };
    db.kitchens.push(kitchen);
    saveDb(db);
    return delay(kitchen);
  },

  async updateKitchen(id: string, body: UpdateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const kitchen = db.kitchens.find((k) => k.id === id && k.restaurant_id === r.id);
    if (!kitchen) throw new ApiError("Kitchen not found", 404);
    if (body.name !== undefined) kitchen.name = body.name;
    if (body.location !== undefined) kitchen.location = body.location;
    saveDb(db);
    return delay({ ...kitchen });
  },

  async deleteKitchen(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const exists = db.kitchens.some((k) => k.id === id && k.restaurant_id === r.id);
    if (!exists) throw new ApiError("Kitchen not found", 404);
    db.kitchens = db.kitchens.filter((k) => k.id !== id);
    saveDb(db);
    return delay(undefined);
  },

  async listWarehouses() {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(db.warehouses.filter((w) => w.restaurant_id === r.id));
  },

  async createWarehouse(body: CreateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const warehouse: Warehouse = {
      id: `wh-${Date.now()}`,
      restaurant_id: r.id,
      name: body.name,
      location: body.location ?? null,
      created_at: now(),
    };
    db.warehouses.push(warehouse);
    saveDb(db);
    return delay(warehouse);
  },

  async updateWarehouse(id: string, body: UpdateLocationInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const warehouse = db.warehouses.find((w) => w.id === id && w.restaurant_id === r.id);
    if (!warehouse) throw new ApiError("Warehouse not found", 404);
    if (body.name !== undefined) warehouse.name = body.name;
    if (body.location !== undefined) warehouse.location = body.location;
    saveDb(db);
    return delay({ ...warehouse });
  },

  async deleteWarehouse(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const exists = db.warehouses.some((w) => w.id === id && w.restaurant_id === r.id);
    if (!exists) throw new ApiError("Warehouse not found", 404);
    db.warehouses = db.warehouses.filter((w) => w.id !== id);
    saveDb(db);
    return delay(undefined);
  },

  async listAdminCustomers(
    filters?: AdminCustomerFilters,
  ): Promise<Paginated<AdminCustomer>> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    // Restaurant-scoped, across every branch, and soft-deleted rows are hidden.
    const rows = db.customers
      .filter((c) => c.restaurant_id === r.id && c.deleted_at === null)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const start = (page - 1) * page_size;
    const items: AdminCustomer[] = rows.slice(start, start + page_size).map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      created_at: c.created_at,
    }));
    const result: Paginated<AdminCustomer> = {
      items,
      page,
      page_size,
      total: rows.length,
    };
    return delay(result);
  },

  // ---- Daily production targets (Admin) ----

  async listProductionTargets(
    filters?: AdminProductionTargetFilters,
  ): Promise<ProductionTarget[]> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    let rows = db.production_targets.filter((t) => t.restaurant_id === r.id);
    if (filters?.kitchen_id) rows = rows.filter((t) => t.kitchen_id === filters.kitchen_id);
    if (filters?.date) rows = rows.filter((t) => t.target_date === filters.date);
    return delay(sortTargets(rows).map(toPublicTarget));
  },

  async getProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.production_targets.find(
      (t) => t.id === id && t.restaurant_id === r.id,
    );
    if (!found) throw new ApiError("Production target not found", 404);
    return delay(toPublicTarget(found));
  },

  async createProductionTarget(
    body: CreateProductionTargetInput,
  ): Promise<ProductionTarget> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const kitchen = db.kitchens.find(
      (k) => k.id === body.kitchen_id && k.restaurant_id === r.id,
    );
    if (!kitchen) throw new ApiError("Kitchen not found", 404);
    validateTargetLines(body.lines ?? []);
    const duplicate = db.production_targets.find(
      (t) =>
        t.restaurant_id === r.id &&
        t.kitchen_id === body.kitchen_id &&
        t.target_date === body.target_date,
    );
    if (duplicate) {
      throw new ApiError(
        "A target already exists for this kitchen and date.",
        409,
        DUPLICATE_TARGET,
      );
    }
    const id = `ptgt-${Date.now()}`;
    const created: MockProductionTarget = {
      id,
      restaurant_id: r.id,
      kitchen_id: kitchen.id,
      kitchen_name: kitchen.name,
      target_date: body.target_date,
      status: "PENDING",
      note: body.note?.trim() ? body.note.trim() : null,
      created_at: now(),
      lines: buildTargetLines(db, id, body.lines),
    };
    db.production_targets.push(created);
    saveDb(db);
    return delay(toPublicTarget(created));
  },

  async updateProductionTarget(
    id: string,
    body: UpdateProductionTargetInput,
  ): Promise<ProductionTarget> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.production_targets.find(
      (t) => t.id === id && t.restaurant_id === r.id,
    );
    if (!found) throw new ApiError("Production target not found", 404);
    if (found.status !== "PENDING") {
      throw new ApiError(
        "Only pending targets can be edited.",
        409,
        TARGET_NOT_EDITABLE,
      );
    }
    if (body.note !== undefined) {
      found.note = body.note.trim() ? body.note.trim() : null;
    }
    if (body.lines !== undefined) {
      validateTargetLines(body.lines);
      found.lines = buildTargetLines(db, id, body.lines);
    }
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  async deleteProductionTarget(id: string): Promise<void> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.production_targets.find(
      (t) => t.id === id && t.restaurant_id === r.id,
    );
    if (!found) throw new ApiError("Production target not found", 404);
    if (found.status !== "PENDING") {
      throw new ApiError(
        "Only pending targets can be deleted.",
        409,
        TARGET_NOT_DELETABLE,
      );
    }
    db.production_targets = db.production_targets.filter((t) => t.id !== id);
    saveDb(db);
    return delay(undefined);
  },

  /**
   * COMPLETED → ALLOCATED. Admin splits each ready line across branches. Validates
   * the whole body before mutating so a bad branch or an over-allocated line can
   * never leave a half-recorded split. No stock moves — dispatch (the kitchen's
   * move) is what the real backend debits against.
   */
  async allocateProductionTarget(
    id: string,
    body: AllocateProductionTargetInput,
  ): Promise<ProductionTarget> {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.production_targets.find(
      (t) => t.id === id && t.restaurant_id === r.id,
    );
    if (!found) throw new ApiError("Production target not found", 404);
    if (found.status !== "COMPLETED") {
      throw new ApiError(
        `Cannot allocate a ${found.status.toLowerCase()} target.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }

    const allocations = body.allocations ?? [];
    if (allocations.length === 0) {
      throw new ApiError("At least one branch allocation is required.", 422);
    }

    const perLine = new Map<string, number>();
    const resolved: ProductionTargetAllocation[] = [];
    for (const a of allocations) {
      const line = found.lines.find((l) => l.id === a.line_id);
      if (!line) throw new ApiError(`Line ${a.line_id} not found`, 400);
      const branch = db.branches.find(
        (b) => b.id === a.branch_id && b.restaurant_id === r.id,
      );
      // A branch from another restaurant is a 404, not a 403 — scope leaks nothing.
      if (!branch) throw new ApiError("Branch not found", 404);
      if (!Number.isInteger(a.quantity) || a.quantity <= 0) {
        throw new ApiError("Quantity must be greater than 0.", 409, INVALID_QUANTITY);
      }
      perLine.set(a.line_id, (perLine.get(a.line_id) ?? 0) + a.quantity);
      resolved.push({
        id: `${found.id}-a${resolved.length + 1}`,
        line_item_id: line.id,
        product_id: line.product_id,
        product_name: line.product_name,
        branch_id: branch.id,
        branch_name: branch.name,
        quantity: a.quantity,
        status: "ALLOCATED",
      });
    }

    // No line may be allocated beyond what the kitchen produced.
    for (const line of found.lines) {
      const allocated = perLine.get(line.id) ?? 0;
      if (allocated > line.quantity) {
        throw new ApiError(
          `Allocated ${allocated} of ${line.product_name}, but only ${line.quantity} were produced.`,
          409,
          TARGET_ALLOCATION_EXCEEDS_PRODUCED,
        );
      }
    }

    found.allocations = resolved;
    found.status = "ALLOCATED";
    if (body.note !== undefined) found.note = body.note.trim() || found.note;
    notifyRole(
      db,
      { restaurantId: found.restaurant_id, role: "KITCHEN_MANAGER", kitchenId: found.kitchen_id },
      {
        title: "Production target allocated",
        body: `Admin allocated the ${found.target_date} target across branches. Dispatch when ready.`,
        entityType: "production_target",
        entityId: found.id,
      },
    );
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  async listEmployees(params) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;
    const all = db.employees.filter((e) => e.restaurant_id === r.id);
    const start = (page - 1) * page_size;
    const items: Employee[] = all.slice(start, start + page_size).map((e) => ({
      id: e.id,
      email: e.email,
      full_name: e.full_name,
      role: e.role,
      is_active: e.is_active,
      branch_id: e.branch_id,
      kitchen_id: e.kitchen_id,
      warehouse_id: e.warehouse_id,
      created_at: e.created_at,
    }));
    const result: Paginated<Employee> = {
      items,
      page,
      page_size,
      total: all.length,
    };
    return delay(result);
  },

  async createUser(body: CreateAdminUserInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);

    const allowedRoles = ["BRANCH_MANAGER", "KITCHEN_MANAGER", "WAREHOUSE_MANAGER"] as const;
    if (!allowedRoles.includes(body.role)) {
      throw new ApiError("Cannot create this role", 400);
    }

    const email = body.email.trim().toLowerCase();
    if (findUser(db, email)) {
      throw new ApiError("A user with this email already exists", 409, "conflict");
    }

    let branchId: string | null = null;
    let kitchenId: string | null = null;
    let warehouseId: string | null = null;

    if (body.role === "BRANCH_MANAGER") {
      if (!body.branch_id) throw new ApiError("branch_id is required for BRANCH_MANAGER", 400);
      const branch = db.branches.find(
        (b) => b.id === body.branch_id && b.restaurant_id === r.id,
      );
      if (!branch) throw new ApiError("Branch not found", 404);
      branchId = branch.id;
    } else if (body.role === "KITCHEN_MANAGER") {
      if (!body.kitchen_id) throw new ApiError("kitchen_id is required for KITCHEN_MANAGER", 400);
      const kitchen = db.kitchens.find(
        (k) => k.id === body.kitchen_id && k.restaurant_id === r.id,
      );
      if (!kitchen) throw new ApiError("Kitchen not found", 404);
      kitchenId = kitchen.id;
    } else {
      if (!body.warehouse_id) {
        throw new ApiError("warehouse_id is required for WAREHOUSE_MANAGER", 400);
      }
      const warehouse = db.warehouses.find(
        (w) => w.id === body.warehouse_id && w.restaurant_id === r.id,
      );
      if (!warehouse) throw new ApiError("Warehouse not found", 404);
      warehouseId = warehouse.id;
    }

    const tempPassword = randomPassword();
    const nextId =
      db.users.reduce((max, u) => Math.max(max, typeof u.me.id === "number" ? u.me.id : 0), 0) + 1;
    const userId = String(nextId);
    const role = body.role as UserRole;

    db.users.push({
      email,
      password: tempPassword,
      me: {
        id: nextId,
        email,
        full_name: body.full_name.trim(),
        role,
        restaurant_id: me.restaurant_id ?? 1,
        created_by_id: me.id,
        is_active: true,
      },
    });

    db.employees.push({
      id: `emp-${nextId}`,
      restaurant_id: r.id,
      email,
      full_name: body.full_name.trim(),
      role: body.role,
      is_active: true,
      branch_id: branchId,
      kitchen_id: kitchenId,
      warehouse_id: warehouseId,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      created_at: now(),
    });

    saveDb(db);

    const result: CreateAdminUserResult = {
      user_id: userId,
      email,
      role: body.role,
      credential_email_sent: true,
      temporary_password: tempPassword,
    };
    return delay(result, 400);
  },

  async updateUser(id: string, body: UpdateAdminUserInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const employee = db.employees.find((e) => e.id === id && e.restaurant_id === r.id);
    if (!employee) throw new ApiError("Employee not found", 404);

    if (body.branch_id !== undefined) {
      if (employee.role !== "BRANCH_MANAGER") {
        throw new ApiError("branch_id is only valid for a branch manager", 409, "conflict");
      }
      const branch = db.branches.find((b) => b.id === body.branch_id && b.restaurant_id === r.id);
      if (!branch) throw new ApiError("Branch not found", 404);
      employee.branch_id = branch.id;
    }
    if (body.kitchen_id !== undefined) {
      if (employee.role !== "KITCHEN_MANAGER") {
        throw new ApiError("kitchen_id is only valid for a kitchen manager", 409, "conflict");
      }
      const kitchen = db.kitchens.find((k) => k.id === body.kitchen_id && k.restaurant_id === r.id);
      if (!kitchen) throw new ApiError("Kitchen not found", 404);
      employee.kitchen_id = kitchen.id;
    }
    if (body.warehouse_id !== undefined) {
      if (employee.role !== "WAREHOUSE_MANAGER" && employee.role !== "WAREHOUSE_STAFF") {
        throw new ApiError("warehouse_id is only valid for warehouse roles", 409, "conflict");
      }
      const warehouse = db.warehouses.find(
        (w) => w.id === body.warehouse_id && w.restaurant_id === r.id,
      );
      if (!warehouse) throw new ApiError("Warehouse not found", 404);
      employee.warehouse_id = warehouse.id;
    }

    // Resolve the login account by the CURRENT email before any email change,
    // so a rename still finds the right record to migrate.
    const account = findUser(db, employee.email);

    if (body.email !== undefined) {
      const newEmail = body.email.trim().toLowerCase();
      if (newEmail && newEmail !== employee.email.toLowerCase()) {
        // Mirror the backend: a clash with any OTHER user is a 409.
        if (findUser(db, newEmail)) {
          throw new ApiError("Email already in use", 409, "conflict");
        }
        employee.email = newEmail;
        if (account) account.email = newEmail;
      }
    }

    if (body.full_name !== undefined) employee.full_name = body.full_name.trim();
    if (body.is_active !== undefined) employee.is_active = body.is_active;
    if (body.phone_number !== undefined) {
      employee.phone_number = body.phone_number.trim() || null;
    }
    if (body.address !== undefined) employee.address = body.address.trim() || null;
    if (body.image_url !== undefined) employee.image_url = body.image_url || null;
    if (body.cnic_front_url !== undefined) {
      employee.cnic_front_url = body.cnic_front_url || null;
    }
    if (body.cnic_back_url !== undefined) {
      employee.cnic_back_url = body.cnic_back_url || null;
    }

    if (account) {
      account.me = {
        ...account.me,
        email: employee.email,
        full_name: employee.full_name,
        is_active: employee.is_active,
      };
    }

    saveDb(db);

    return delay(toEmployeeOut(employee));
  },

  async revokeUser(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const employee = db.employees.find((e) => e.id === id && e.restaurant_id === r.id);
    if (!employee) throw new ApiError("Employee not found", 404);
    employee.is_active = false;
    const account = findUser(db, employee.email);
    if (account) account.me = { ...account.me, is_active: false };
    saveDb(db);
    return delay(toEmployeeOut(employee));
  },

  async restoreUser(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const employee = db.employees.find((e) => e.id === id && e.restaurant_id === r.id);
    if (!employee) throw new ApiError("Employee not found", 404);
    employee.is_active = true;
    const account = findUser(db, employee.email);
    if (account) account.me = { ...account.me, is_active: true };
    saveDb(db);
    return delay(toEmployeeOut(employee));
  },

  async deleteUser(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const employee = db.employees.find((e) => e.id === id && e.restaurant_id === r.id);
    if (!employee) throw new ApiError("Employee not found", 404);
    db.employees = db.employees.filter((e) => e.id !== id);
    db.users = db.users.filter((u) => u.email.toLowerCase() !== employee.email.toLowerCase());
    saveDb(db);
    return delay(undefined);
  },

  async getAdminSettings() {
    const me = requireAuth();
    const db = loadDb();
    const account = findUser(db, me.email);
    const profile: AdminProfile = {
      id: String(me.id),
      email: me.email,
      full_name: me.full_name,
      image_url: account?.image_url ?? null,
      role: me.role,
    };
    return delay(profile);
  },

  async updateAdminSettings(body: UpdateAdminProfileInput) {
    const me = requireAuth();
    const db = loadDb();
    const account = findUser(db, me.email);
    if (!account) throw new ApiError("Account not found", 404);
    if (body.full_name !== undefined) {
      account.me = { ...account.me, full_name: body.full_name.trim() };
    }
    if (body.image_url !== undefined) {
      account.image_url = body.image_url === "" ? null : body.image_url;
    }
    saveDb(db);
    setSession(account.me);
    const profile: AdminProfile = {
      id: String(account.me.id),
      email: account.me.email,
      full_name: account.me.full_name,
      image_url: account.image_url ?? null,
      role: account.me.role,
    };
    return delay(profile);
  },

  // The real backend stores the file and returns a hosted URL; the mock has no
  // server, so it inlines the image as a data URL. That persists in localStorage
  // and renders offline, which is all the employee list/preview needs.
  async uploadEmployeeImage(file: File): Promise<string> {
    requireAuth();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError("Could not read the image", 400));
      reader.readAsDataURL(file);
    });
    return delay(dataUrl, 300);
  },

  async recordSale(body: CreateSaleInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const amountNum = typeof body.amount === "string" ? parseFloat(body.amount) : body.amount;
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      throw new ApiError("Amount must be greater than 0", 422);
    }
    let branchId: string | null = null;
    if (body.branch_id) {
      const branch = db.branches.find(
        (b) => b.id === body.branch_id && b.restaurant_id === r.id,
      );
      if (!branch) throw new ApiError("Branch not found", 404);
      branchId = branch.id;
    }
    const sale: SalesRecord = {
      id: `sale-${Date.now()}`,
      restaurant_id: r.id,
      branch_id: branchId,
      amount: amountNum.toFixed(2),
      occurred_at: body.occurred_at ?? now(),
      note: body.note?.trim() || null,
      created_at: now(),
    };
    db.sales.push(sale);
    saveDb(db);
    return delay(sale);
  },

  async listSalesRecords(filters?: SalesRecordFilters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 50;
    let rows = db.sales.filter((s) => s.restaurant_id === r.id);
    if (filters?.branch_id) {
      rows = rows.filter((s) => s.branch_id === filters.branch_id);
    }
    rows = [...rows].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    const start = (page - 1) * page_size;
    const items = rows.slice(start, start + page_size);
    const result: Paginated<SalesRecord> = {
      items,
      page,
      page_size,
      total: rows.length,
    };
    return delay(result);
  },

  async getSalesSummary(filters?: SalesSummaryFilters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const period: SalesPeriod = filters?.period ?? "daily";

    let rows = db.sales.filter((s) => s.restaurant_id === r.id);
    if (filters?.branch_id) rows = rows.filter((s) => s.branch_id === filters.branch_id);
    if (filters?.start) rows = rows.filter((s) => s.occurred_at >= filters.start!);
    if (filters?.end) rows = rows.filter((s) => s.occurred_at <= filters.end!);

    const byBucket = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;
    for (const sale of rows) {
      const key = salesBucketStart(sale.occurred_at, period);
      const amount = parseFloat(sale.amount) || 0;
      const entry = byBucket.get(key) ?? { total: 0, count: 0 };
      entry.total += amount;
      entry.count += 1;
      byBucket.set(key, entry);
      grandTotal += amount;
    }

    const buckets: SalesSummaryBucket[] = [...byBucket.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period_start, { total, count }]) => ({
        period_start,
        total_amount: total.toFixed(2),
        count,
      }));

    const summary: SalesSummary = {
      period,
      buckets,
      total_amount: grandTotal.toFixed(2),
      total_count: rows.length,
    };
    return delay(summary);
  },

  async listProductPricing(filters?: ProductPricingFilters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const items: ProductPricing[] = db.products
      .filter((p) => p.restaurant_id === r.id)
      /**
       * `unpriced=true` is Admin's pricing queue; once priced, a product drops
       * off it. An absent param means every product.
       *
       * Which price does "unpriced" mean, now that there are two? Selling —
       * because that is the one that blocks a sale (409 `product_not_priced`),
       * whereas a missing cost price only dents a margin report. Flagged to the
       * backend team as a contract question; if the server disagrees, this is
       * the line to change.
       */
      .filter((p) => !filters?.kind || p.kind === filters.kind)
      .filter((p) => !filters?.sellable_only || p.is_sellable)
      // "Unpriced" only ever means a *sellable* thing with no price. A sack of
      // flour is not waiting to be priced; it is never priced.
      .filter((p) => !filters?.unpriced || (p.is_sellable && p.selling_price == null))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        kind: p.kind,
        is_sellable: p.is_sellable,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        category: p.category,
        is_available: p.is_available,
      }));
    return delay(items);
  },

  async updateProductPricing(productId: string, body: UpdateProductPricingInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const product = db.products.find((p) => p.id === productId && p.restaurant_id === r.id);
    if (!product) throw new ApiError("Product not found", 404);

    /**
     * Partial, and the mock enforces the same rule as the server so the UI's
     * dirty-field handling is actually exercised: a key that is absent is left
     * alone, an explicit `null` clears. `"cost_price" in body` — not a
     * truthiness check — is what distinguishes the two.
     */
    const money = (value: unknown, field: string): string | null => {
      if (value === null || value === "") return null;
      const n = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(n) || n < 0) {
        throw new ApiError(`${field} must be 0 or greater`, 400);
      }
      return n.toFixed(2);
    };

    // The server refuses rather than trusting the UI to have hidden the field —
    // so the mock does too, or the hidden-field rule is untested.
    const touchesSellFields =
      ("selling_price" in body && body.selling_price !== null) ||
      ("category" in body && body.category != null) ||
      "is_available" in body;
    if (!product.is_sellable && touchesSellFields) {
      throw new ApiError(
        "This product can't be sold, so it can't be priced or categorised.",
        409,
        POS_ERROR.PRODUCT_NOT_SELLABLE,
        { product_id: product.id, kind: product.kind },
      );
    }

    if ("cost_price" in body) product.cost_price = money(body.cost_price, "cost_price");
    if ("selling_price" in body) {
      product.selling_price = money(body.selling_price, "selling_price");
    }
    if ("category" in body) product.category = body.category?.trim() || null;
    if ("is_available" in body) product.is_available = body.is_available ?? true;

    saveDb(db);

    const result: ProductPricing = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      kind: product.kind,
      is_sellable: product.is_sellable,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      category: product.category,
      is_available: product.is_available,
    };
    return delay(result);
  },

  async listProductRequests(filters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(paginateRequests(db, r.id, "BRANCH_TO_ADMIN", filters));
  },

  async listDistributionRequests(filters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(paginateRequests(db, r.id, "WAREHOUSE_TO_ADMIN_PO", filters));
  },

  async listAdminKitchenRequests(filters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    // Oversight only. Admin never actions these — the moves belong to the
    // kitchen and the warehouse — so there is no matching status endpoint.
    return delay(paginateRequests(db, r.id, "KITCHEN_TO_WAREHOUSE", filters));
  },

  async listDispatchRequests(filters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    return delay(paginateRequests(db, r.id, "KITCHEN_TO_ADMIN", filters));
  },

  async listAdminInventory(filters?: AdminInventoryFilters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    // The only inventory projection carrying cost_price. Every location.
    const items: AdminInventoryItem[] = db.inventory
      .filter((item) => item.restaurant_id === r.id)
      .filter(
        (item) =>
          !filters?.location_type || item.location_type === filters.location_type,
      )
      .filter(
        (item) => !filters?.location_id || item.location_id === filters.location_id,
      )
      .map((item) => {
        const product = db.products.find((p) => p.id === item.product_id);
        return {
          id: item.id,
          product_id: item.product_id,
          product: {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            cost_price: product?.cost_price ?? null,
            kind: product?.kind,
            stock_unit: product?.stock_unit ?? "EACH",
          },
          quantity: item.quantity,
          batch_code: item.batch_code,
          expiry_date: item.expiry_date,
          location_type: item.location_type,
          location_id: item.location_id,
        };
      });
    return delay(items);
  },

  async listAdminWasteEvents(filters?: WasteEventFilters) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);

    const events = db.waste_events
      .filter((e) => e.restaurant_id === r.id)
      .filter((e) => !filters?.movement_type || e.movement_type === filters.movement_type)
      .filter(
        (e) =>
          !filters?.location_type ||
          e.location_type === (filters.location_type as WasteLocationType),
      )
      .filter((e) => !filters?.location_id || e.location_id === filters.location_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toPublicWasteEvent);
    return delay(events);
  },

  async getRequest(requestId) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.requests.find((req) => req.id === requestId && req.restaurant_id === r.id);
    // Kitchen requests became readable in Phase 4.1 — this used to 404 on one.
    // Admin oversees the kitchen⇄warehouse loop; the PATCH still refuses.
    if (!found) throw new ApiError("Request not found", 404);
    return delay(toPublicRequest(found));
  },

  async updateRequestStatus(requestId: string, body: UpdateRequestStatusInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.requests.find((req) => req.id === requestId && req.restaurant_id === r.id);
    if (!found) throw new ApiError("Request not found", 404);
    // Readable, but not actionable: approving and dispatching a kitchen request
    // belong to the warehouse. A 403 rather than a 404 — Admin can see it.
    if (found.type === "KITCHEN_TO_WAREHOUSE") {
      throw new ApiError(
        "Admin cannot action kitchen requests.",
        403,
        "forbidden",
      );
    }
    // Allocating a dispatch request carries per-branch quantities the status
    // PATCH can't express — it has its own endpoint. Reject still runs here.
    if (found.type === "KITCHEN_TO_ADMIN" && body.to_status === "ALLOCATED") {
      throw new ApiError(
        "Use the allocation endpoint to allocate a dispatch request.",
        409,
      );
    }

    // Keyed by type, which is what keeps DISPATCHED honest: Admin dispatches a
    // PO to the warehouse, but the identically-named move on a kitchen request
    // belongs to the warehouse and is unreachable here by construction.
    const allowed = allowedTransitions(found.type, found.status as RequestStatus);
    if (!allowed.includes(body.to_status)) {
      throw new ApiError(
        `Cannot transition from ${found.status} to ${body.to_status}`,
        400,
      );
    }

    // Forwarding must name a kitchen: the API has no default, and this is what
    // scopes the request so only that kitchen ever sees it.
    if (body.to_status === "FORWARDED_TO_KITCHEN") {
      if (!body.target_location_id) {
        throw new ApiError(
          "A target kitchen is required to forward this request.",
          409,
          MISSING_KITCHEN_TARGET,
        );
      }
      if (body.target_location_type !== "KITCHEN") {
        throw new ApiError(
          "Requests can only be forwarded to a kitchen.",
          409,
          INVALID_KITCHEN_TARGET,
        );
      }
      const kitchen = db.kitchens.find(
        (k) => k.id === body.target_location_id && k.restaurant_id === r.id,
      );
      // A kitchen from another restaurant is a 404, not a 403 — scope leaks
      // nothing about what exists elsewhere.
      if (!kitchen) throw new ApiError("Kitchen not found", 404);

      found.target_location_type = "KITCHEN";
      found.target_location_id = body.target_location_id;
    }

    if (body.to_status === "PARTIALLY_APPROVED") {
      const approvals = body.line_approvals ?? [];
      if (approvals.length === 0) {
        throw new ApiError("line_approvals are required for partial approval", 400);
      }
      for (const approval of approvals) {
        const line = found.line_items.find((item) => item.id === approval.line_item_id);
        if (!line) {
          throw new ApiError(`Line item ${approval.line_item_id} not found`, 400);
        }
        if (
          !Number.isFinite(approval.quantity_approved) ||
          approval.quantity_approved < 0 ||
          approval.quantity_approved > line.quantity_requested
        ) {
          throw new ApiError(
            `Invalid quantity_approved for line ${approval.line_item_id}`,
            400,
          );
        }
        line.quantity_approved = approval.quantity_approved;
      }
    }

    if (body.to_status === "APPROVED") {
      found.line_items = found.line_items.map((line) => ({
        ...line,
        quantity_approved: line.quantity_approved ?? line.quantity_requested,
      }));
    }

    found.status = body.to_status;
    if (body.notes !== undefined) {
      found.notes = body.notes;
    }
    found.updated_at = now();
    saveDb(db);
    return delay(toPublicRequest(found));
  },

  async allocateDispatchRequest(requestId: string, body: AllocateDispatchInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.requests.find(
      (req) => req.id === requestId && req.restaurant_id === r.id,
    );
    if (!found) throw new ApiError("Request not found", 404);
    if (found.type !== "KITCHEN_TO_ADMIN") {
      throw new ApiError("Only dispatch requests can be allocated.", 409);
    }
    if (found.status !== "PENDING") {
      throw new ApiError(`Cannot allocate a request in status ${found.status}`, 409);
    }

    const allocations = body.allocations ?? [];
    if (allocations.length === 0) {
      throw new ApiError("At least one branch allocation is required", 422);
    }

    // Validate everything before mutating: a bad branch or an over-allocated line
    // rejects the whole call, so a half-recorded split can never happen. No stock
    // moves here — dispatch (the kitchen's move) is what debits/credits stock.
    const perLine = new Map<string, number>();
    const resolved: RequestBranchAllocation[] = [];
    for (const a of allocations) {
      const line = found.line_items.find((l) => l.id === a.line_item_id);
      if (!line) throw new ApiError(`Line item ${a.line_item_id} not found`, 400);
      const branch = db.branches.find(
        (b) => b.id === a.branch_id && b.restaurant_id === r.id,
      );
      // A branch from another restaurant is a 404, not a 403 — scope leaks nothing.
      if (!branch) throw new ApiError("Branch not found", 404);
      if (!Number.isInteger(a.quantity) || a.quantity <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
      perLine.set(a.line_item_id, (perLine.get(a.line_item_id) ?? 0) + a.quantity);
      resolved.push({
        id: `alloc-${Date.now()}-${resolved.length + 1}`,
        line_item_id: line.id,
        product_id: line.product_id,
        product_name: line.product_name,
        branch_id: branch.id,
        branch_name: branch.name,
        quantity: a.quantity,
        status: "ALLOCATED",
      });
    }

    // No line may be allocated beyond what the kitchen said was ready.
    for (const line of found.line_items) {
      const allocated = perLine.get(line.id) ?? 0;
      if (allocated > line.quantity_requested) {
        throw new ApiError(
          `Allocated ${allocated} of ${line.product_name}, but only ${line.quantity_requested} are ready.`,
          409,
          ALLOCATION_EXCEEDS_READY,
        );
      }
    }

    // quantity_approved becomes the total each line's branches will receive.
    found.line_items = found.line_items.map((line) => ({
      ...line,
      quantity_approved: perLine.get(line.id) ?? 0,
    }));
    found.allocations = resolved;
    found.status = "ALLOCATED";
    if (body.notes !== undefined) found.notes = body.notes;
    found.updated_at = now();
    saveDb(db);
    return delay(toPublicRequest(found));
  },

  async listNotifications(filters?: NotificationFilters) {
    const me = requireAuth();
    const db = loadDb();

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;

    // Scoped to the signed-in user, newest first.
    const all = db.notifications
      .filter((n) => String(n.user_id) === String(me.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const start = (page - 1) * page_size;
    const result: Paginated<AppNotification> = {
      items: all.slice(start, start + page_size),
      page,
      page_size,
      total: all.length,
    };
    return delay(result);
  },

  async markNotificationRead(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const found = db.notifications.find(
      (n) => n.id === id && String(n.user_id) === String(me.id),
    );
    if (!found) throw new ApiError("Notification not found", 404);
    found.is_read = true;
    saveDb(db);
    return delay(found as AppNotification);
  },

  async listWarehouseProducts(filters?: WarehouseProductFilters) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);
    // Cost price is projected away, not nulled: the warehouse introduces the
    // product and Admin prices it, and the keeper must never see what it cost.
    const products: WarehouseProduct[] = db.products
      .filter((p) => p.restaurant_id === warehouse.restaurant_id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        kind: warehouseKind(p.kind),
        stock_unit: p.stock_unit ?? "EACH",
        units_per_pack: p.units_per_pack ?? null,
      }));
    return delay(products);
  },

  async createWarehouseProduct(body: CreateWarehouseProductInput) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const name = body.name?.trim() ?? "";
    if (!name) throw new ApiError("Request validation failed", 422);

    const kind = body.kind ?? "RAW_MATERIAL";
    // The server 422s a FINISHED_GOOD here; the type already forbids it, but a
    // hand-rolled call shouldn't slip past the mock either.
    if (kind !== "RAW_MATERIAL" && kind !== "RESALE") {
      throw new ApiError("A warehouse can't create kitchen-made products", 422);
    }

    const sku = body.sku?.trim() || null;
    if (
      sku &&
      db.products.some(
        (p) =>
          p.restaurant_id === warehouse.restaurant_id &&
          (p.sku ?? "").toLowerCase() === sku.toLowerCase(),
      )
    ) {
      throw new ApiError(
        "A product with this SKU already exists.",
        409,
        DUPLICATE_SKU,
      );
    }

    const created: MockProduct = {
      id: `prod-${Date.now()}`,
      restaurant_id: warehouse.restaurant_id,
      name,
      sku,
      // The warehouse buys things. RAW_MATERIAL by default; RESALE when it's
      // bought and sold untouched. It can never create a FINISHED_GOOD — the
      // kitchen makes those, and the server 422s the attempt.
      kind,
      is_sellable: kind === "RESALE",
      // Unpriced until Admin sets it — this is what puts it on Admin's queue.
      // `selling_price` is the one that blocks a sale outright: until it's set
      // the server answers 409 `product_not_priced`.
      cost_price: null,
      selling_price: null,
      category: null,
      is_available: true,
      // Unit of measure. Defaults to EACH when the caller omits it.
      stock_unit: body.stock_unit ?? "EACH",
      units_per_pack:
        body.units_per_pack != null && body.units_per_pack >= 1
          ? Math.floor(body.units_per_pack)
          : null,
    };
    db.products.push(created);
    saveDb(db);

    const result: WarehouseProduct = {
      id: created.id,
      name: created.name,
      sku: created.sku,
      kind: warehouseKind(created.kind),
      stock_unit: created.stock_unit ?? "EACH",
      units_per_pack: created.units_per_pack ?? null,
    };
    return delay(result);
  },

  async updateWarehouseProduct(
    productId: string,
    body: UpdateWarehouseProductInput,
  ) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const product = db.products.find(
      (p) => p.id === productId && p.restaurant_id === warehouse.restaurant_id,
    );
    if (!product) throw new ApiError("Product not found", 404);

    // Name, when sent, must not be blanked out.
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new ApiError("Request validation failed", 422);
      product.name = name;
    }

    // Kind is still constrained to what a warehouse may own — never a
    // FINISHED_GOOD, exactly as on create.
    if (body.kind !== undefined) {
      if (body.kind !== "RAW_MATERIAL" && body.kind !== "RESALE") {
        throw new ApiError("A warehouse can't own kitchen-made products", 422);
      }
      product.kind = body.kind;
      product.is_sellable = body.kind === "RESALE";
    }

    // SKU: "" clears it; a value must stay unique per restaurant (ignoring self).
    if (body.sku !== undefined) {
      const sku = body.sku?.trim() || null;
      if (
        sku &&
        db.products.some(
          (p) =>
            p.id !== productId &&
            p.restaurant_id === warehouse.restaurant_id &&
            (p.sku ?? "").toLowerCase() === sku.toLowerCase(),
        )
      ) {
        throw new ApiError(
          "A product with this SKU already exists.",
          409,
          DUPLICATE_SKU,
        );
      }
      product.sku = sku;
    }

    if (body.stock_unit !== undefined) {
      product.stock_unit = body.stock_unit;
    }

    if (body.units_per_pack !== undefined) {
      product.units_per_pack =
        body.units_per_pack != null && body.units_per_pack >= 1
          ? Math.floor(body.units_per_pack)
          : null;
    }

    // Quantity is intentionally untouched: inventory rows are a separate store
    // and this endpoint has no access to them.
    saveDb(db);

    const result: WarehouseProduct = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      kind: warehouseKind(product.kind),
      stock_unit: product.stock_unit ?? "EACH",
      units_per_pack: product.units_per_pack ?? null,
    };
    return delay(result);
  },

  async setWarehouseReorderLevel(
    productId: string,
    body: UpdateReorderLevelInput,
  ) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const level = Number(body.reorder_level);
    if (!Number.isInteger(level) || level < 0) {
      throw new ApiError("Reorder level must be 0 or greater", 422);
    }
    const product = db.products.find(
      (p) => p.id === productId && p.restaurant_id === warehouse.restaurant_id,
    );
    if (!product) throw new ApiError("Product not found", 404);

    upsertReorderLevel(db, warehouse, productId, level);
    saveDb(db);

    const result: ReorderLevel = {
      product_id: productId,
      location_type: "WAREHOUSE",
      location_id: warehouse.id,
      reorder_level: level,
    };
    return delay(result);
  },

  async listWarehouseInventory() {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);
    const items = db.inventory
      .filter(
        (item) =>
          item.location_type === "WAREHOUSE" && item.location_id === warehouse.id,
      )
      .map((item) => toPublicInventoryItem(item, db));
    return delay(items);
  },

  async receiveWarehouseStock(body: ReceiveStockInput) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }

    const product = db.products.find(
      (p) => p.id === body.product_id && p.restaurant_id === warehouse.restaurant_id,
    );
    if (!product) throw new ApiError("Product not found", 404);

    const batchCode = body.batch_code?.trim() ?? "";
    const expiryDate = body.expiry_date?.trim() || null;

    // Optional low-stock limit, upserted alongside the intake. Without one, no
    // alert ever fires for this product.
    if (body.reorder_level !== undefined && body.reorder_level !== null) {
      const level = Number(body.reorder_level);
      if (!Number.isInteger(level) || level < 0) {
        throw new ApiError("Reorder level must be 0 or greater", 422);
      }
      upsertReorderLevel(db, warehouse, product.id, level);
    }

    // Stock is tracked per product+batch. Receiving into an existing batch adds
    // to it rather than replacing it; a new batch becomes its own row.
    const existing = findWarehouseStock(db, warehouse, product.id, batchCode);

    let received: MockInventoryItem;
    if (existing) {
      existing.quantity += quantity;
      if (expiryDate) existing.expiry_date = expiryDate;
      received = existing;
    } else {
      received = {
        id: `inv-${Date.now()}`,
        restaurant_id: warehouse.restaurant_id,
        product_id: product.id,
        product: { id: product.id, name: product.name, sku: product.sku },
        quantity,
        batch_code: batchCode,
        expiry_date: expiryDate,
        location_type: "WAREHOUSE",
        location_id: warehouse.id,
      };
      db.inventory.push(received);
    }

    saveDb(db);
    return delay(toPublicInventoryItem(received, db));
  },

  async listNearExpiryInventory(filters?: NearExpiryFilters) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const withinDays = filters?.within_days ?? 7;
    if (!Number.isInteger(withinDays) || withinDays < 0 || withinDays > 365) {
      throw new ApiError("within_days must be between 0 and 365", 422);
    }

    // `YYYY-MM-DD` strings compare correctly lexicographically, so no parsing.
    // Already-expired stock is included: it is the most urgent, not the least.
    const cutoff = localYmd(new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000));
    const items = db.inventory
      .filter(
        (item) =>
          item.location_type === "WAREHOUSE" &&
          item.location_id === warehouse.id &&
          item.expiry_date != null &&
          item.expiry_date <= cutoff,
      )
      .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""))
      .map((item) => toPublicInventoryItem(item, db));

    return delay(items);
  },

  async adjustWarehouseStock(body: AdjustStockInput) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const delta = Number(body.quantity_delta);
    if (!Number.isInteger(delta) || delta === 0) {
      throw new ApiError(
        "Adjustment must be a non-zero whole number",
        409,
        INVALID_QUANTITY,
      );
    }

    const item = findWarehouseStock(db, warehouse, body.product_id, body.batch_code);
    if (!item) throw new ApiError("Stock not found", 404);

    const next = item.quantity + delta;
    if (next < 0) {
      throw new ApiError(
        `Only ${item.quantity} on hand for this batch`,
        409,
        INSUFFICIENT_STOCK,
      );
    }

    item.quantity = next;
    saveDb(db);
    return delay(toPublicInventoryItem(item, db));
  },

  async updateWarehouseStockExpiry(
    itemId: string,
    body: UpdateStockExpiryInput,
  ) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const item = db.inventory.find(
      (i) =>
        i.id === itemId &&
        i.location_type === "WAREHOUSE" &&
        i.location_id === warehouse.id,
    );
    if (!item) throw new ApiError("Stock not found", 404);

    const expiry = body.expiry_date?.trim() || null;
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      throw new ApiError("Expiry date must be YYYY-MM-DD", 422);
    }

    // Only the date changes — quantity and batch stay put.
    item.expiry_date = expiry;
    saveDb(db);
    return delay(toPublicInventoryItem(item, db));
  },

  async wasteWarehouseStock(body: WasteStockInput) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const movementType = body.movement_type ?? "WASTE";
    if (movementType !== "WASTE" && movementType !== "EXPIRY") {
      throw new ApiError(
        "Movement type must be WASTE or EXPIRY",
        409,
        INVALID_MOVEMENT_TYPE,
      );
    }

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }

    const item = findWarehouseStock(db, warehouse, body.product_id, body.batch_code);
    if (!item) throw new ApiError("Stock not found", 404);

    if (quantity > item.quantity) {
      throw new ApiError(
        `Only ${item.quantity} on hand for this batch`,
        409,
        INSUFFICIENT_STOCK,
      );
    }

    item.quantity -= quantity;

    // Persist the write-off so it shows up in the Waste & expired history for
    // both the warehouse and Admin. Reason/notes are captured here — the point
    // of the log is to answer "what was thrown away and why" later.
    const wasteReason = body.waste_reason ?? null;
    db.waste_events.push({
      id: `waste-${Date.now()}`,
      restaurant_id: warehouse.restaurant_id,
      product_id: item.product_id,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
      },
      quantity,
      movement_type: movementType,
      waste_reason: wasteReason,
      batch_code: item.batch_code,
      notes: body.notes?.trim() || null,
      location_type: "WAREHOUSE",
      location_id: warehouse.id,
      created_at: now(),
      created_by: me.full_name ?? me.email,
    });

    saveDb(db);
    return delay(toPublicInventoryItem(item, db));
  },

  async listWarehouseWasteEvents(filters?: WasteEventFilters) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const events = db.waste_events
      .filter(
        (e) =>
          e.restaurant_id === warehouse.restaurant_id &&
          e.location_type === "WAREHOUSE" &&
          e.location_id === warehouse.id,
      )
      .filter((e) => !filters?.movement_type || e.movement_type === filters.movement_type)
      // Newest first — a write-off log is read top-down.
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toPublicWasteEvent);
    return delay(events);
  },

  async updateWarehouseWasteEvent(
    eventId: string,
    body: UpdateWasteEventInput,
  ) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const event = db.waste_events.find(
      (e) =>
        e.id === eventId &&
        e.restaurant_id === warehouse.restaurant_id &&
        e.location_type === "WAREHOUSE" &&
        e.location_id === warehouse.id,
    );
    if (!event) throw new ApiError("Waste record not found", 404);

    if (body.movement_type !== undefined) {
      if (body.movement_type !== "WASTE" && body.movement_type !== "EXPIRY") {
        throw new ApiError(
          "Movement type must be WASTE or EXPIRY",
          409,
          INVALID_MOVEMENT_TYPE,
        );
      }
      event.movement_type = body.movement_type;
    }
    if (body.waste_reason !== undefined) event.waste_reason = body.waste_reason;
    if (body.notes !== undefined) event.notes = body.notes?.trim() || null;

    if (body.quantity !== undefined) {
      const newQty = Number(body.quantity);
      if (!Number.isInteger(newQty) || newQty <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
      // Keep on-hand honest: correcting a write-off up removes the extra units,
      // down returns them. If the batch row is gone (fully consumed since), we
      // can't re-sync stock, so just record the corrected figure.
      const delta = newQty - event.quantity;
      if (delta !== 0) {
        const stock = findWarehouseStock(
          db,
          warehouse,
          event.product_id,
          event.batch_code,
        );
        if (stock) {
          if (delta > 0 && delta > stock.quantity) {
            throw new ApiError(
              `Only ${stock.quantity} on hand for this batch`,
              409,
              INSUFFICIENT_STOCK,
            );
          }
          stock.quantity -= delta;
        }
      }
      event.quantity = newQty;
    }

    saveDb(db);
    return delay(toPublicWasteEvent(event));
  },

  async listWarehouseUsers(params) {
    const me = requireAuth();
    requireWarehouseManager(me);
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;

    // Location-scoped: every staff member attached to this warehouse, whoever
    // created them. Any manager of the warehouse manages the whole roster, so a
    // replacement or co-manager sees the same list. `created_by_id` survives on
    // the record but is historical only — it no longer gates visibility.
    const all = db.employees.filter(
      (e) => e.warehouse_id === warehouse.id && e.role === "WAREHOUSE_STAFF",
    );

    const start = (page - 1) * page_size;
    const items: WarehouseStaff[] = all
      .slice(start, start + page_size)
      .map((e) => ({
        id: e.id,
        email: e.email,
        full_name: e.full_name,
        job_title: e.job_title ?? null,
        phone_number: e.phone_number ?? null,
        address: e.address ?? null,
        image_url: e.image_url ?? null,
        cnic_front_url: e.cnic_front_url ?? null,
        cnic_back_url: e.cnic_back_url ?? null,
        role: e.role,
        is_active: e.is_active,
        warehouse_id: warehouse.id,
        created_at: e.created_at,
      }));

    const result: Paginated<WarehouseStaff> = {
      items,
      page,
      page_size,
      total: all.length,
    };
    return delay(result);
  },

  async createWarehouseUser(body: CreateWarehouseStaffInput) {
    const me = requireAuth();
    requireWarehouseManager(me);
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const email = body.email.trim().toLowerCase();
    if (findUser(db, email)) {
      throw new ApiError("A user with this email already exists", 409, "conflict");
    }

    const fullName = body.full_name?.trim() || null;
    const empId = `emp-${nextEmployeeSeq(db)}`;

    // No `db.users` account: warehouse staff are personnel records and cannot
    // sign in — the same rule as kitchen staff. The record lives only on the
    // roster (`db.employees`).
    db.employees.push({
      id: empId,
      restaurant_id: warehouse.restaurant_id,
      email,
      full_name: fullName ?? "",
      job_title: body.job_title?.trim() || null,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      role: "WAREHOUSE_STAFF",
      is_active: true,
      branch_id: null,
      kitchen_id: null,
      warehouse_id: warehouse.id,
      created_at: now(),
    });

    saveDb(db);

    const result: CreateWarehouseStaffResult = {
      user_id: empId,
      email,
      full_name: fullName,
      job_title: body.job_title?.trim() || null,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      role: "WAREHOUSE_STAFF",
      warehouse_id: warehouse.id,
    };
    return delay(result, 400);
  },

  // No revoke/restore for warehouse staff: they are personnel records with no
  // login to revoke, and the live routes 404. Delete is the only removal.

  async deleteWarehouseUser(id: string) {
    const me = requireAuth();
    requireWarehouseManager(me);
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);
    // Scope by warehouse membership — another warehouse's staff (or a bad id)
    // 404s, which is what stops one manager reaching another's roster.
    const emp = db.employees.find(
      (e) => e.id === id && e.warehouse_id === warehouse.id && e.role === "WAREHOUSE_STAFF",
    );
    if (!emp) throw new ApiError("Staff member not found.", 404);
    db.employees = db.employees.filter((e) => e !== emp);
    saveDb(db);
    return delay(undefined as never, 300);
  },

  async updateWarehouseUser(id: string, body: UpdateWarehouseStaffInput): Promise<WarehouseStaff> {
    const me = requireAuth();
    requireWarehouseManager(me);
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);
    const emp = db.employees.find(
      (e) => e.id === id && e.warehouse_id === warehouse.id && e.role === "WAREHOUSE_STAFF",
    );
    if (!emp) throw new ApiError("Staff member not found.", 404);
    if (body.email !== undefined) {
      const newEmail = body.email.trim().toLowerCase();
      // Re-saving the member's own email is fine; a clash with anyone else 409s.
      if (newEmail !== emp.email && emailTaken(db, newEmail)) {
        throw new ApiError("A user with this email already exists.", 409, "conflict");
      }
      emp.email = newEmail;
    }
    if (body.full_name !== undefined) emp.full_name = body.full_name.trim();
    if (body.job_title !== undefined) emp.job_title = body.job_title.trim() || null;
    if (body.phone_number !== undefined) emp.phone_number = body.phone_number.trim() || null;
    if (body.address !== undefined) emp.address = body.address.trim() || null;
    if (body.image_url !== undefined) emp.image_url = body.image_url || null;
    if (body.cnic_front_url !== undefined) emp.cnic_front_url = body.cnic_front_url || null;
    if (body.cnic_back_url !== undefined) emp.cnic_back_url = body.cnic_back_url || null;
    saveDb(db);
    const result: WarehouseStaff = {
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name || null,
      job_title: emp.job_title ?? null,
      phone_number: emp.phone_number ?? null,
      address: emp.address ?? null,
      image_url: emp.image_url ?? null,
      cnic_front_url: emp.cnic_front_url ?? null,
      cnic_back_url: emp.cnic_back_url ?? null,
      role: emp.role,
      is_active: emp.is_active,
      warehouse_id: warehouse.id,
    };
    return delay(result, 300);
  },

  async createWarehousePo(body: CreatePurchaseOrderInput) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const lines = body.lines ?? [];
    if (lines.length === 0) {
      throw new ApiError("At least one line is required", 422);
    }

    const stamp = Date.now();
    const lineItems = lines.map((line, index) => {
      const quantity = Number(line.quantity_requested);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
      const product = db.products.find(
        (p) => p.id === line.product_id && p.restaurant_id === warehouse.restaurant_id,
      );
      if (!product) throw new ApiError("Product not found", 404);
      return {
        id: `li-${stamp}-${index}`,
        product_id: product.id,
        product_name: product.name,
        quantity_requested: quantity,
        quantity_approved: null,
      };
    });

    const created: MockStockRequest = {
      id: `req-${stamp}`,
      restaurant_id: warehouse.restaurant_id,
      type: "WAREHOUSE_TO_ADMIN_PO",
      status: "PENDING",
      notes: body.notes?.trim() || null,
      // Admin's inbox renders this label, so it must be set here too.
      from_label: warehouse.name,
      created_at: now(),
      updated_at: now(),
      line_items: lineItems,
      requester_id: me.id,
      assignee_id: null,
      source_location_type: "WAREHOUSE",
      source_location_id: warehouse.id,
      target_location_type: null,
      target_location_id: null,
    };

    db.requests.push(created);
    saveDb(db);
    return delay(toPublicWarehouseRequest(created));
  },

  async listWarehousePos(filters?: WarehouseRequestFilters) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;

    // ASSUMPTION: the contract says "list this manager's PO requests", read here
    // as requester-scoped rather than warehouse-wide. If the live API returns
    // every PO for the warehouse, drop the requester_id check below.
    let rows = db.requests.filter(
      (req) =>
        req.type === "WAREHOUSE_TO_ADMIN_PO" &&
        req.restaurant_id === warehouse.restaurant_id &&
        req.requester_id === me.id,
    );
    if (filters?.status && filters.status !== "all") {
      rows = rows.filter((req) => req.status === filters.status);
    }

    const start = (page - 1) * page_size;
    const result: Paginated<WarehouseRequest> = {
      items: rows.slice(start, start + page_size).map(toPublicWarehouseRequest),
      page,
      page_size,
      total: rows.length,
    };
    return delay(result);
  },

  async listWarehouseKitchenRequests(filters?: WarehouseRequestFilters) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;

    let rows = db.requests.filter(
      (req) =>
        req.type === "KITCHEN_TO_WAREHOUSE" &&
        req.restaurant_id === warehouse.restaurant_id &&
        req.target_location_type === "WAREHOUSE" &&
        req.target_location_id === warehouse.id,
    );
    if (filters?.status && filters.status !== "all") {
      rows = rows.filter((req) => req.status === filters.status);
    }

    const start = (page - 1) * page_size;
    const result: Paginated<WarehouseRequest> = {
      items: rows.slice(start, start + page_size).map(toPublicWarehouseRequest),
      page,
      page_size,
      total: rows.length,
    };
    return delay(result);
  },

  async getWarehouseRequest(requestId: string) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const found = db.requests.find(
      (req) => req.id === requestId && req.restaurant_id === warehouse.restaurant_id,
    );
    // Anything outside this warehouse's reach is invisible rather than forbidden.
    if (!found || !isWarehouseVisibleRequest(found, warehouse, me.id)) {
      throw new ApiError("Request not found", 404);
    }

    return delay(toPublicWarehouseRequest(found));
  },

  async updateWarehouseRequestStatus(
    requestId: string,
    body: UpdateWarehouseRequestStatusInput,
  ) {
    const me = requireAuth();
    const db = loadDb();
    const warehouse = resolveMyWarehouse(db, me);

    const found = db.requests.find(
      (req) => req.id === requestId && req.restaurant_id === warehouse.restaurant_id,
    );
    if (!found || !isWarehouseVisibleRequest(found, warehouse, me.id)) {
      throw new ApiError("Request not found", 404);
    }

    const type = found.type as WarehouseRequestType;
    const allowed = warehouseAllowedTransitions(
      type,
      found.status as WarehouseRequestStatus,
    );
    if (!allowed.includes(body.to_status)) {
      throw new ApiError(
        `Cannot move from ${found.status} to ${body.to_status}`,
        409,
        INVALID_TRANSITION,
      );
    }

    for (const approval of body.line_approvals ?? []) {
      const line = found.line_items.find((item) => item.id === approval.line_item_id);
      if (
        !line ||
        !Number.isInteger(approval.quantity_approved) ||
        approval.quantity_approved < 0 ||
        approval.quantity_approved > line.quantity_requested
      ) {
        throw new ApiError(
          `Invalid approved quantity for line ${approval.line_item_id}`,
          409,
          "invalid_approval_quantity",
        );
      }
      line.quantity_approved = approval.quantity_approved;
    }

    // Every stock effect below is gated on the request TYPE first. DISPATCHED
    // and RECEIVED both belong to two vocabularies and mean opposite things, so
    // a status-only check here would debit stock on the wrong request.
    if (type === "KITCHEN_TO_WAREHOUSE" && body.to_status === "DISPATCHED") {
      if (
        found.target_location_type !== "WAREHOUSE" ||
        !found.target_location_id
      ) {
        throw new ApiError(
          "This request has no warehouse target",
          409,
          MISSING_WAREHOUSE_TARGET,
        );
      }
      applyDispatchToStock(db, warehouse, found);
    }

    if (
      type === "WAREHOUSE_TO_ADMIN_PO" &&
      (body.to_status === "RECEIVED" || body.to_status === "REPORTED")
    ) {
      applyPoReceipts(db, warehouse, found, body);
    }

    found.status = body.to_status;
    if (body.notes !== undefined) {
      found.notes = body.notes;
    }
    if (body.assignee_id !== undefined) {
      found.assignee_id = Number(body.assignee_id);
    }
    found.updated_at = now();

    saveDb(db);
    return delay(toPublicWarehouseRequest(found));
  },

  // ---- Kitchen (Phase 4) ----

  async listKitchenInventory() {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const items = db.inventory
      .filter(
        (item) =>
          item.location_type === "KITCHEN" && item.location_id === kitchen.id,
      )
      .map((item) => toPublicKitchenInventoryItem(item, db));
    return delay(items);
  },

  async listKitchenWarehouseInventory(warehouseId: string) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    // Another restaurant's warehouse is a 404 — scope leaks nothing about what
    // exists elsewhere.
    const warehouse = db.warehouses.find(
      (w) => w.id === warehouseId && w.restaurant_id === kitchen.restaurant_id,
    );
    if (!warehouse) throw new ApiError("Warehouse not found", 404);

    // Quantity only. The kitchen judges availability; cost stays Admin-only, so
    // this reuses the kitchen's cost-free projection.
    const items = db.inventory
      .filter(
        (item) =>
          item.location_type === "WAREHOUSE" && item.location_id === warehouse.id,
      )
      .map((item) => toPublicKitchenInventoryItem(item, db));
    return delay(items);
  },

  async listKitchenNearExpiry(filters?: KitchenNearExpiryFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const withinDays = filters?.within_days ?? 7;
    if (!Number.isInteger(withinDays) || withinDays < 0 || withinDays > 365) {
      throw new ApiError("within_days must be between 0 and 365", 422);
    }

    const cutoff = localYmd(new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000));
    const items = db.inventory
      .filter(
        (item) =>
          item.location_type === "KITCHEN" &&
          item.location_id === kitchen.id &&
          item.quantity > 0 &&
          item.expiry_date != null &&
          item.expiry_date <= cutoff,
      )
      .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""))
      .map((item) => toPublicKitchenInventoryItem(item, db));

    return delay(items);
  },

  async listKitchenLabels(filters?: KitchenLabelFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const batch = filters?.batch_code?.trim();
    const labels: KitchenLabel[] = db.inventory
      .filter(
        (item) =>
          item.location_type === "KITCHEN" &&
          item.location_id === kitchen.id &&
          // Sticker data for stock that isn't there would just be waste paper.
          item.quantity > 0 &&
          (!filters?.product_id || item.product_id === filters.product_id) &&
          (!batch || item.batch_code === batch),
      )
      .map((item) => ({
        product_id: item.product_id,
        product_name: item.product.name,
        sku: item.product.sku,
        batch_code: item.batch_code,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        location_type: "KITCHEN" as const,
        location_id: kitchen.id,
      }));

    // A non-matching batch is an empty list, not a 404.
    return delay(labels);
  },

  async wasteKitchenStock(body: KitchenWasteInput) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const movementType = body.movement_type ?? "WASTE";
    if (movementType !== "WASTE" && movementType !== "EXPIRY") {
      throw new ApiError(
        "Movement type must be WASTE or EXPIRY",
        409,
        INVALID_MOVEMENT_TYPE,
      );
    }

    if (!body.waste_reason) {
      throw new ApiError("Request validation failed", 422);
    }

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }

    const item = findKitchenStock(db, kitchen, body.product_id, body.batch_code);
    // No row at all is a 404 — the common outcome of a mistyped batch code, and
    // deliberately distinct from having the batch but not enough of it.
    if (!item) throw new ApiError("No stock found for that product/batch", 404);

    if (quantity > item.quantity) {
      throw new ApiError(
        `Only ${item.quantity} on hand for this batch`,
        409,
        INSUFFICIENT_STOCK,
      );
    }

    item.quantity -= quantity;

    // Persist the write-off so it shows up in the kitchen's Waste & expired log.
    db.waste_events.push({
      id: `waste-${Date.now()}`,
      restaurant_id: kitchen.restaurant_id,
      product_id: item.product_id,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
      },
      quantity,
      movement_type: movementType,
      waste_reason: body.waste_reason ?? null,
      batch_code: item.batch_code,
      notes: body.notes?.trim() || null,
      location_type: "KITCHEN",
      location_id: kitchen.id,
      created_at: now(),
      created_by: me.full_name ?? me.email,
    });

    saveDb(db);
    return delay(toPublicKitchenInventoryItem(item, db));
  },

  async listKitchenWasteEvents(filters?: WasteEventFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const events = db.waste_events
      .filter(
        (e) =>
          e.restaurant_id === kitchen.restaurant_id &&
          e.location_type === "KITCHEN" &&
          e.location_id === kitchen.id,
      )
      .filter((e) => !filters?.movement_type || e.movement_type === filters.movement_type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toPublicWasteEvent);
    return delay(events);
  },

  async createKitchenCount(body: CreateKitchenCountInput) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const lines = body.lines ?? [];
    if (lines.length === 0) {
      throw new ApiError("At least one line is required", 422);
    }

    const seen = new Set<string>();
    for (const line of lines) {
      const key = `${line.product_id}::${line.batch_code?.trim() ?? ""}`;
      if (seen.has(key)) {
        throw new ApiError(
          "The same product and batch appears twice in this count.",
          409,
          KITCHEN_DUPLICATE_COUNT_LINE,
        );
      }
      seen.add(key);

      if (!Number.isInteger(line.counted_quantity) || line.counted_quantity < 0) {
        throw new ApiError("Counted quantity must be 0 or greater", 422);
      }
    }

    const countId = `cnt-${Date.now()}`;
    const countLines: KitchenCountLine[] = lines.map((line, index) => {
      const item = findKitchenStock(db, kitchen, line.product_id, line.batch_code);
      if (!item) throw new ApiError("No stock found for that product/batch", 404);

      const variance = line.counted_quantity - item.quantity;

      // A count is not a report: a non-zero variance rewrites on-hand to the
      // counted number. That correction is the whole point of the endpoint.
      const systemQuantity = item.quantity;
      item.quantity = line.counted_quantity;

      return {
        id: `${countId}-l${index + 1}`,
        product_id: line.product_id,
        product_name: item.product.name,
        batch_code: item.batch_code || null,
        counted_quantity: line.counted_quantity,
        system_quantity: systemQuantity,
        variance,
      };
    });

    const count: MockStockCount = {
      id: countId,
      restaurant_id: kitchen.restaurant_id,
      location_type: "KITCHEN",
      location_id: kitchen.id,
      counted_by_id: String(me.id),
      notes: body.notes ?? null,
      created_at: now(),
      lines: countLines,
    };
    db.stock_counts.push(count);

    saveDb(db);
    return delay(toPublicStockCount(count));
  },

  async listKitchenCounts(filters?: KitchenCountFilters) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;

    const all = db.stock_counts
      .filter((c) => c.location_id === kitchen.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const start = (page - 1) * page_size;
    const result: Paginated<KitchenStockCount> = {
      items: all.slice(start, start + page_size).map(toPublicStockCount),
      page,
      page_size,
      total: all.length,
    };
    return delay(result);
  },

  async listKitchenUsers(params) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const page = params?.page ?? 1;
    const page_size = params?.page_size ?? 20;

    // Location-scoped: every staff member on this kitchen's roster, whoever
    // created them, so any manager of the kitchen — a replacement or
    // co-manager — sees the same roster.
    const all = db.employees.filter(
      (e) => e.kitchen_id === kitchen.id && e.role === "KITCHEN_STAFF",
    );

    const start = (page - 1) * page_size;
    const items: KitchenStaff[] = all.slice(start, start + page_size).map((e) => ({
      id: e.id,
      email: e.email,
      full_name: e.full_name || null,
      job_title: e.job_title ?? null,
      phone_number: e.phone_number ?? null,
      address: e.address ?? null,
      image_url: e.image_url ?? null,
      cnic_front_url: e.cnic_front_url ?? null,
      cnic_back_url: e.cnic_back_url ?? null,
      role: e.role,
      is_active: e.is_active,
      kitchen_id: kitchen.id,
      created_at: e.created_at,
    }));

    const result: Paginated<KitchenStaff> = {
      items,
      page,
      page_size,
      total: all.length,
    };
    return delay(result);
  },

  async createKitchenUser(body: CreateKitchenStaffInput) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const email = body.email.trim().toLowerCase();
    // A roster record is not a user account, but the email must still be unique
    // across every user AND every roster member — the server 409s on any clash.
    if (emailTaken(db, email)) {
      throw new ApiError("A user with this email already exists.", 409, "conflict");
    }

    const fullName = body.full_name?.trim() || null;
    const empId = `emp-${nextEmployeeSeq(db)}`;

    // No `db.users` account: kitchen staff are personnel records and cannot sign
    // in. The record lives only on the roster (`db.employees`).
    db.employees.push({
      id: empId,
      restaurant_id: kitchen.restaurant_id,
      email,
      full_name: fullName ?? "",
      job_title: body.job_title?.trim() || null,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      role: "KITCHEN_STAFF",
      is_active: true,
      branch_id: null,
      kitchen_id: kitchen.id,
      warehouse_id: null,
      created_at: now(),
    });

    saveDb(db);

    const result: CreateKitchenStaffResult = {
      user_id: empId,
      email,
      full_name: fullName,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      job_title: body.job_title?.trim() || null,
      role: "KITCHEN_STAFF",
      kitchen_id: kitchen.id,
    };
    return delay(result, 400);
  },

  async deleteKitchenUser(id: string) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    // Scope by kitchen membership — another kitchen's staff (or a bad id) 404s.
    const emp = db.employees.find(
      (e) => e.id === id && e.kitchen_id === kitchen.id && e.role === "KITCHEN_STAFF",
    );
    if (!emp) throw new ApiError("Staff member not found.", 404);
    db.employees = db.employees.filter((e) => e !== emp);
    saveDb(db);
    return delay(undefined as never, 300);
  },

  async updateKitchenUser(id: string, body: UpdateKitchenStaffInput): Promise<KitchenStaff> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const emp = db.employees.find(
      (e) => e.id === id && e.kitchen_id === kitchen.id && e.role === "KITCHEN_STAFF",
    );
    if (!emp) throw new ApiError("Staff member not found.", 404);
    if (body.email !== undefined) {
      const newEmail = body.email.trim().toLowerCase();
      // Re-saving the member's own email is fine; a clash with anyone else 409s.
      if (newEmail !== emp.email && emailTaken(db, newEmail)) {
        throw new ApiError("A user with this email already exists.", 409, "conflict");
      }
      emp.email = newEmail;
    }
    if (body.full_name !== undefined) emp.full_name = body.full_name.trim();
    if (body.phone_number !== undefined) emp.phone_number = body.phone_number.trim() || null;
    if (body.address !== undefined) emp.address = body.address.trim() || null;
    if (body.image_url !== undefined) emp.image_url = body.image_url || null;
    if (body.cnic_front_url !== undefined) emp.cnic_front_url = body.cnic_front_url || null;
    if (body.cnic_back_url !== undefined) emp.cnic_back_url = body.cnic_back_url || null;
    if (body.job_title !== undefined) emp.job_title = body.job_title.trim() || null;
    saveDb(db);
    const result: KitchenStaff = {
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name || null,
      job_title: emp.job_title ?? null,
      phone_number: emp.phone_number ?? null,
      address: emp.address ?? null,
      image_url: emp.image_url ?? null,
      cnic_front_url: emp.cnic_front_url ?? null,
      cnic_back_url: emp.cnic_back_url ?? null,
      role: emp.role,
      is_active: emp.is_active,
      kitchen_id: kitchen.id,
    };
    return delay(result, 300);
  },

  async uploadKitchenStaffImage(file: File): Promise<string> {
    requireAuth();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new ApiError("Could not read the image", 400));
      reader.readAsDataURL(file);
    });
    return delay(dataUrl, 300);
  },

  /**
   * The live route stores the file privately and returns a signed link that
   * expires. The mock has no server, so it inlines a data URL — which never
   * expires. That difference is deliberate but worth remembering: the
   * expired-image path simply cannot be reproduced offline.
   */
  async uploadStaffDocument(file: File, kind: StaffDocumentKind): Promise<string> {
    requireAuth();
    if (kind !== "personal" && kind !== "cnic") {
      throw new ApiError("Unknown document kind", 409, "invalid_document_kind");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new ApiError("Image must be under 10 MB", 409, "file_too_large");
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new ApiError("Could not read the image", 409, "invalid_image"));
      reader.readAsDataURL(file);
    });
    return delay(dataUrl, 300);
  },

  async listKitchenWarehouses() {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    // Every warehouse Admin has added to this restaurant, ordered by id. Reading
    // the real store — not a fixed list — is what makes the Admin → Kitchen
    // wiring testable offline: create a warehouse in Admin, pick it here.
    const warehouses: KitchenWarehouse[] = db.warehouses
      .filter((w) => w.restaurant_id === kitchen.restaurant_id)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((w) => ({
        id: w.id,
        restaurant_id: w.restaurant_id,
        name: w.name,
        location: w.location ?? null,
        created_at: w.created_at,
      }));
    return delay(warehouses);
  },

  async createKitchenWarehouseRequest(body: CreateKitchenWarehouseRequestInput) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const lines = body.lines ?? [];
    if (lines.length === 0) {
      throw new ApiError("At least one line is required", 422);
    }

    // A restaurant can run several warehouses; this picks which one is debited.
    const warehouse = db.warehouses.find(
      (w) => w.id === body.warehouse_id && w.restaurant_id === kitchen.restaurant_id,
    );
    if (!warehouse) throw new ApiError("Warehouse not found", 404);

    for (const line of lines) {
      if (!Number.isInteger(line.quantity_requested) || line.quantity_requested <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
    }

    const id = `req-${Date.now()}`;
    const created: MockStockRequest = {
      id,
      restaurant_id: kitchen.restaurant_id,
      type: "KITCHEN_TO_WAREHOUSE",
      status: "PENDING",
      notes: body.notes ?? null,
      from_label: kitchen.name,
      created_at: now(),
      updated_at: now(),
      requester_id: typeof me.id === "number" ? me.id : null,
      assignee_id: null,
      source_location_type: "KITCHEN",
      source_location_id: kitchen.id,
      target_location_type: "WAREHOUSE",
      target_location_id: warehouse.id,
      line_items: lines.map((line, index) => ({
        id: `${id}-l${index + 1}`,
        product_id: line.product_id,
        product_name:
          db.products.find((p) => p.id === line.product_id)?.name ?? "Unknown product",
        quantity_requested: line.quantity_requested,
        // No partial approval on this type — stays null for the whole lifecycle.
        quantity_approved: null,
      })),
    };
    db.requests.push(created);

    saveDb(db);
    return delay(toPublicKitchenRequest(created, db));
  },

  async listKitchenWarehouseRequests(filters?: KitchenRequestFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    return delay(
      paginateKitchenRequests(
        db.requests.filter(
          (r) =>
            r.type === "KITCHEN_TO_WAREHOUSE" && r.source_location_id === kitchen.id,
        ),
        db,
        filters,
      ),
    );
  },

  async listKitchenBranchRequests(filters?: KitchenRequestFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    // Only requests Admin actually forwarded here. One forwarded elsewhere is
    // invisible, which is what the Admin-side target enforcement buys.
    return delay(
      paginateKitchenRequests(
        db.requests.filter(
          (r) =>
            r.type === "BRANCH_TO_ADMIN" &&
            r.target_location_type === "KITCHEN" &&
            r.target_location_id === kitchen.id,
        ),
        db,
        filters,
      ),
    );
  },

  async createDispatchNotification(body: CreateDispatchNotificationInput) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const lines = body.lines ?? [];
    if (lines.length === 0) {
      throw new ApiError("At least one line is required", 422);
    }

    // On-hand per product at this kitchen: the notification can't offer to
    // dispatch more than the kitchen actually holds.
    const onHand = (productId: string) =>
      db.inventory
        .filter(
          (i) =>
            i.location_type === "KITCHEN" &&
            i.location_id === kitchen.id &&
            i.product_id === productId,
        )
        .reduce((sum, i) => sum + i.quantity, 0);

    for (const line of lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
      const available = onHand(line.product_id);
      if (line.quantity > available) {
        const name =
          db.products.find((p) => p.id === line.product_id)?.name ?? "product";
        throw new ApiError(
          `Only ${available} of ${name} on hand — can't notify ${line.quantity}.`,
          409,
          INVALID_QUANTITY,
        );
      }
    }

    const id = `req-${Date.now()}`;
    const created: MockStockRequest = {
      id,
      restaurant_id: kitchen.restaurant_id,
      type: "KITCHEN_TO_ADMIN",
      status: "PENDING",
      notes: body.notes ?? null,
      from_label: kitchen.name,
      created_at: now(),
      updated_at: now(),
      requester_id: typeof me.id === "number" ? me.id : null,
      assignee_id: null,
      source_location_type: "KITCHEN",
      source_location_id: kitchen.id,
      // Admin (head office) is the audience; it is not a stock location.
      target_location_type: null,
      target_location_id: null,
      line_items: lines.map((line, index) => ({
        id: `${id}-l${index + 1}`,
        product_id: line.product_id,
        product_name:
          db.products.find((p) => p.id === line.product_id)?.name ?? "Unknown product",
        quantity_requested: line.quantity,
        // Set to the allocated total once Admin splits it across branches.
        quantity_approved: null,
      })),
    };
    db.requests.push(created);

    saveDb(db);
    return delay(toPublicKitchenRequest(created, db));
  },

  async listKitchenDispatchRequests(filters?: KitchenRequestFilters) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    return delay(
      paginateKitchenRequests(
        db.requests.filter(
          (r) =>
            r.type === "KITCHEN_TO_ADMIN" && r.source_location_id === kitchen.id,
        ),
        db,
        filters,
      ),
    );
  },

  async dispatchKitchenRequest(requestId: string) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const found = db.requests.find(
      (r) =>
        r.id === requestId &&
        r.type === "KITCHEN_TO_ADMIN" &&
        r.source_location_id === kitchen.id,
    );
    if (!found) throw new ApiError("Request not found", 404);
    if (found.status !== "ALLOCATED") {
      throw new ApiError(`Cannot dispatch a request in status ${found.status}`, 409);
    }

    // Debit the kitchen for every allocated line before moving the status — a
    // shortfall must leave both stock and status untouched. quantity_approved on
    // each line already equals the sum of that line's allocations.
    applyAllocationToKitchenStock(db, kitchen, found);

    found.status = "DISPATCHED";
    found.allocations = (found.allocations ?? []).map((a) => ({
      ...a,
      status: "DISPATCHED" as const,
    }));
    found.updated_at = now();
    saveDb(db);
    return delay(toPublicKitchenRequest(found, db));
  },

  async getKitchenRequest(requestId: string) {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = findKitchenVisibleRequest(db, kitchen, requestId);
    return delay(toPublicKitchenRequest(found, db));
  },

  async markKitchenRequestLineProduced(requestId: string, lineId: string) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = findKitchenVisibleRequest(db, kitchen, requestId);

    if (found.type !== "BRANCH_TO_ADMIN") {
      throw new ApiError("Not a branch request", 409, KITCHEN_INVALID_REQUEST_TYPE);
    }
    if (found.status !== "IN_PRODUCTION") {
      throw new ApiError(
        "Request isn't in production.",
        409,
        KITCHEN_INVALID_TRANSITION,
      );
    }
    const line = found.line_items.find((l) => l.id === lineId);
    if (!line) throw new ApiError("Line not found", 404);

    // Idempotent: marking an already-produced line is a safe no-op, so a
    // tick-only retry after a failed tick always succeeds.
    line.produced = true;
    found.updated_at = now();
    saveDb(db);
    return delay(toPublicKitchenRequest(found, db));
  },

  async updateKitchenRequestStatus(
    requestId: string,
    body: UpdateKitchenRequestStatusInput,
  ) {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = findKitchenVisibleRequest(db, kitchen, requestId);

    // Resale-only branch requests skip production — the projection resolves each
    // line's kind from the catalog, so reuse it for a single source of truth.
    const resaleOnly = isResaleOnlyBranchRequest(toPublicKitchenRequest(found, db));
    const allowed = kitchenAllowedTransitions(
      found.type as KitchenRequestType,
      found.status as KitchenRequestStatus,
      { resaleOnly },
    );
    if (!allowed.includes(body.to_status)) {
      throw new ApiError(
        `Cannot transition from ${found.status} to ${body.to_status}.`,
        409,
        KITCHEN_INVALID_TRANSITION,
      );
    }

    // Branch requests now require every non-exempt line to be produced before
    // they can advance to PRODUCED — the kitchen makes each line in place. A
    // line zeroed by partial approval is exempt (it can't be produced).
    if (body.to_status === "PRODUCED" && found.type === "BRANCH_TO_ADMIN") {
      const unproduced = found.line_items.filter(
        (line) => line.quantity_approved !== 0 && !line.produced,
      );
      if (unproduced.length > 0) {
        throw new ApiError(
          "Every line must be marked produced before the request can advance.",
          409,
          KITCHEN_LINES_NOT_ALL_PRODUCED,
          {
            unproduced_line_ids: unproduced.map((line) => line.id),
            unproduced_count: unproduced.length,
          },
        );
      }
    }

    // DISPATCHED (branch refill) is the kitchen move that touches stock. If stock
    // is short the status must not move.
    if (body.to_status === "DISPATCHED" && found.type === "BRANCH_TO_ADMIN") {
      applyAllocationToKitchenStock(db, kitchen, found);
    }

    // Crediting the kitchen closes the in-transit window opened by the
    // warehouse's DISPATCHED.
    if (body.to_status === "RECEIVED" && found.type === "KITCHEN_TO_WAREHOUSE") {
      applyKitchenReceiptToStock(db, kitchen, found);
    }

    found.status = body.to_status;
    if (body.notes !== undefined) found.notes = body.notes;
    found.updated_at = now();

    saveDb(db);
    return delay(toPublicKitchenRequest(found, db));
  },

  // ---- Kitchen: finished goods, recipes, production ----

  async listKitchenCatalogue(): Promise<KitchenCatalogueItem[]> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    return delay(
      db.products
        .filter((p) => p.restaurant_id === kitchen.restaurant_id && p.kind === "FINISHED_GOOD")
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku ?? null,
          kind: "FINISHED_GOOD" as const,
          has_recipe: db.kitchen_recipes.some(
            (r) => matchesProductId(p.id, r.product_id) && r.is_active,
          ),
          stock_unit: p.stock_unit ?? "EACH",
        })),
    );
  },

  async createKitchenProduct(body: CreateKitchenProductInput): Promise<KitchenCatalogueItem> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const name = body.name?.trim();
    if (!name) throw new ApiError("Request validation failed", 422);

    const product: MockProduct = {
      id: `prod-${Date.now()}`,
      restaurant_id: kitchen.restaurant_id,
      name,
      sku: body.sku?.trim() || null,
      // No `kind` in the body — the kitchen makes finished goods and nothing
      // else. That is the endpoint's whole reason to exist separately.
      kind: "FINISHED_GOOD",
      is_sellable: true,
      cost_price: null,
      selling_price: null,
      category: null,
      is_available: true,
      stock_unit: body.stock_unit ?? "EACH",
    };

    db.products.push(product);
    saveDb(db);
    return delay({
      id: product.id,
      name: product.name,
      sku: product.sku ?? null,
      kind: "FINISHED_GOOD",
      has_recipe: false,
      stock_unit: product.stock_unit ?? "EACH",
    });
  },

  async listKitchenRecipes(): Promise<KitchenRecipe[]> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    return delay(db.kitchen_recipes.filter((r) => r.kitchen_id === kitchen.id));
  },

  async getKitchenRecipe(id: string): Promise<KitchenRecipe> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = db.kitchen_recipes.find((r) => r.id === id && r.kitchen_id === kitchen.id);
    if (!found) throw new ApiError("Recipe not found", 404);
    return delay(found);
  },

  async createKitchenRecipe(body: CreateKitchenRecipeInput): Promise<KitchenRecipe> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    const product = db.products.find((p) => matchesProductId(p.id, body.product_id));
    if (!product) throw new ApiError("Product not found", 404);
    if (product.kind !== "FINISHED_GOOD") {
      throw new ApiError(
        "Only kitchen-made items can have a recipe.",
        409,
        POS_ERROR.PRODUCT_CANNOT_HAVE_RECIPE,
      );
    }
    if (!body.components.length) throw new ApiError("A recipe needs components", 422);

    for (const c of body.components) {
      const component = db.products.find((p) =>
        matchesProductId(p.id, c.component_product_id),
      );
      if (!component) throw new ApiError("Component not found", 404);
      // A burger made of burgers. The server refuses; so does the mock, or the
      // UI's guard is untested.
      if (component.kind === "FINISHED_GOOD") {
        throw new ApiError(
          "A recipe's components must be raw materials or resale items.",
          409,
          POS_ERROR.NESTED_RECIPE_UNSUPPORTED,
        );
      }
    }

    // Versioned, not edited: the previous active recipe for this product is
    // superseded rather than mutated, so a run already made keeps its history.
    const previous = db.kitchen_recipes.filter(
      (r) => matchesProductId(product.id, r.product_id) && r.kitchen_id === kitchen.id,
    );
    for (const r of previous) r.is_active = false;

    const recipe: MockRecipe = {
      id: `rec-${Date.now()}`,
      restaurant_id: kitchen.restaurant_id,
      kitchen_id: kitchen.id,
      product_id: Number(product.id.replace(/\D/g, "")) || 0,
      product_name: product.name,
      version: previous.length + 1,
      is_active: true,
      yield_qty: body.yield_qty ?? 1,
      note: body.note ?? null,
      components: body.components.map((c) => {
        // Ids on the wire are numeric; stored ids are strings ("prod-001").
        const cp = db.products.find((p) =>
          matchesProductId(p.id, c.component_product_id),
        );
        const stockUnit = cp?.stock_unit ?? "EACH";
        return {
          component_product_id: c.component_product_id,
          component_name: cp?.name,
          quantity: c.quantity,
          stock_unit: stockUnit,
          // The unit the chef typed in; defaults to how the ingredient is
          // stocked. Consumption converts from this to `stock_unit`.
          unit: c.unit ?? stockUnit,
          wastage_bp: c.wastage_bp ?? 0,
        };
      }),
      created_at: now(),
    };

    db.kitchen_recipes.push(recipe);
    saveDb(db);
    return delay(recipe);
  },

  async listKitchenProduction(): Promise<ProductionRun[]> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    return delay(
      db.production_runs
        .filter((r) => r.location_type === "KITCHEN" && r.location_id === kitchen.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  },

  async getKitchenProductionRun(id: string): Promise<ProductionRun> {
    const me = requireAuth();
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = db.production_runs.find(
      (r) => r.id === id && r.location_type === "KITCHEN" && r.location_id === kitchen.id,
    );
    if (!found) throw new ApiError("Production run not found", 404);
    return delay(found);
  },

  async produceKitchenProduct(
    body: KitchenProduceInput,
    idempotencyKey?: string,
  ): Promise<ProductionRun> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);

    // Replay: a repeated key returns the original run and moves no stock.
    if (idempotencyKey) {
      const prior = producedByIdempotencyKey.get(idempotencyKey);
      if (prior) return delay(prior);
    }

    const product = db.products.find((p) => matchesProductId(p.id, body.product_id));
    if (!product) throw new ApiError("Product not found", 404);
    if (product.kind !== "FINISHED_GOOD") {
      throw new ApiError("Only kitchen-made items can be produced.", 409, POS_ERROR.NOT_A_FINISHED_GOOD);
    }

    const recipe = db.kitchen_recipes.find(
      (r) => matchesProductId(product.id, r.product_id) && r.is_active,
    ) ?? db.kitchen_recipes.find((r) => r.product_name === product.name && r.is_active);
    if (!recipe) {
      throw new ApiError("This item has no recipe yet.", 409, POS_ERROR.NO_ACTIVE_RECIPE);
    }

    const batches = Math.ceil(body.quantity / (recipe.yield_qty || 1));

    // How much of a component one batch consumes, in the component's stock
    // unit. A recipe written in grams ("100") against flour stocked in kg is
    // converted here (100 g → 0.1 kg); same-unit recipes pass through unchanged.
    const perBatch = (c: (typeof recipe.components)[number]): number => {
      const from = c.unit ?? c.stock_unit ?? "EACH";
      const to = c.stock_unit ?? from;
      return tryConvertQty(c.quantity, from, to) ?? c.quantity;
    };

    // Check every component BEFORE moving any of it. Components are consumed
    // before the output is credited, so a shortfall can never mint stock.
    for (const c of recipe.components) {
      const needed = perBatch(c) * batches;
      const onHand = db.inventory
        .filter(
          (i) =>
            i.location_type === "KITCHEN" &&
            i.location_id === kitchen.id &&
            matchesProductId(i.product_id, c.component_product_id),
        )
        .reduce((sum, i) => sum + i.quantity, 0);
      if (onHand < needed) {
        throw new ApiError(
          `Not enough ${c.component_name ?? "stock"} — ${onHand} on hand, ${needed} needed.`,
          409,
          "insufficient_stock",
        );
      }
    }

    for (const c of recipe.components) {
      let remaining = perBatch(c) * batches;
      for (const item of db.inventory) {
        if (remaining <= 0) break;
        if (
          item.location_type !== "KITCHEN" ||
          item.location_id !== kitchen.id ||
          !matchesProductId(item.product_id, c.component_product_id)
        ) {
          continue;
        }
        const take = Math.min(item.quantity, remaining);
        item.quantity -= take;
        remaining -= take;
      }
    }

    const expiryDate = body.expiry_date || null;
    // Merge only when batch AND expiry match — two runs sharing a batch code but
    // carrying different shelf-lives must stay separate rows so near-expiry is right.
    const existing = db.inventory.find(
      (i) =>
        i.location_type === "KITCHEN" &&
        i.location_id === kitchen.id &&
        i.product_id === product.id &&
        (i.batch_code || "") === (body.batch_code || "") &&
        (i.expiry_date || null) === expiryDate,
    );
    if (existing) {
      existing.quantity += body.quantity;
    } else {
      db.inventory.push({
        id: `inv-${Date.now()}-${product.id}`,
        restaurant_id: kitchen.restaurant_id,
        product_id: product.id,
        product: { id: product.id, name: product.name, sku: product.sku ?? null },
        quantity: body.quantity,
        batch_code: body.batch_code || "",
        expiry_date: expiryDate,
        location_type: "KITCHEN",
        location_id: kitchen.id,
      });
    }

    const run: MockProductionRun = {
      id: `kprod-${Date.now()}`,
      restaurant_id: kitchen.restaurant_id,
      location_type: "KITCHEN",
      location_id: kitchen.id,
      // Set, unlike a branch run — a recipe decided these lines.
      recipe_id: recipe.id,
      lines: [
        ...recipe.components.map((c, i) => ({
          id: `kline-${Date.now()}-i${i}`,
          product_id: String(c.component_product_id),
          product_name: c.component_name,
          role: "INPUT" as const,
          // What was actually drawn from stock, in the component's stock unit.
          quantity: perBatch(c) * batches,
        })),
        {
          id: `kline-${Date.now()}-out`,
          product_id: product.id,
          product_name: product.name,
          role: "OUTPUT" as const,
          quantity: body.quantity,
        },
      ],
      note: body.note ?? null,
      created_at: now(),
      created_by_id: String(me.id),
    };

    db.production_runs.push(run);
    saveDb(db);
    if (idempotencyKey) producedByIdempotencyKey.set(idempotencyKey, run);
    return delay(run);
  },

  // ---- Daily production targets (Kitchen) — manager-only, kitchen-scoped ----

  async listKitchenProductionTargets(
    filters?: KitchenProductionTargetFilters,
  ): Promise<ProductionTarget[]> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    let rows = db.production_targets.filter((t) => t.kitchen_id === kitchen.id);
    if (filters?.date) rows = rows.filter((t) => t.target_date === filters.date);
    return delay(sortTargets(rows).map(toPublicTarget));
  },

  async getKitchenProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = db.production_targets.find(
      (t) => t.id === id && t.kitchen_id === kitchen.id,
    );
    if (!found) throw new ApiError("Production target not found", 404);
    return delay(toPublicTarget(found));
  },

  async acknowledgeProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = requireMyTarget(db, kitchen, id);
    if (found.status !== "PENDING") {
      throw new ApiError(
        `Cannot acknowledge a ${found.status.toLowerCase()} target.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }
    found.status = "ACKNOWLEDGED";
    notifyRole(
      db,
      { restaurantId: found.restaurant_id, role: "ADMIN" },
      {
        title: "Production target acknowledged",
        body: `${kitchen.name} acknowledged the target for ${found.target_date}.`,
        entityType: "production_target",
        entityId: found.id,
      },
    );
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  /** ACKNOWLEDGED → IN_PRODUCTION. The kitchen has started making the target. */
  async startProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = requireMyTarget(db, kitchen, id);
    if (found.status !== "ACKNOWLEDGED") {
      throw new ApiError(
        `Cannot start a ${found.status.toLowerCase()} target.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }
    found.status = "IN_PRODUCTION";
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  /**
   * Mark one line ready — a made item produced, or a resale item set aside.
   * Only while IN_PRODUCTION. Status-only here: crediting finished-goods stock
   * is the real backend's job (see the wiring note handed to that team).
   */
  async markProductionTargetLineProduced(
    id: string,
    lineId: string,
  ): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = requireMyTarget(db, kitchen, id);
    if (found.status !== "IN_PRODUCTION") {
      throw new ApiError(
        `Lines can only be marked while a target is in production.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }
    const line = found.lines.find((l) => l.id === lineId);
    if (!line) throw new ApiError("Line not found", 404);
    line.produced = true;
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  /** IN_PRODUCTION → COMPLETED. Every line must be ready first; Admin is told. */
  async completeProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = requireMyTarget(db, kitchen, id);
    if (found.status !== "IN_PRODUCTION") {
      throw new ApiError(
        `Cannot complete a ${found.status.toLowerCase()} target.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }
    if (!found.lines.every((l) => l.produced)) {
      throw new ApiError(
        "Every product must be marked ready before completing.",
        409,
        INVALID_TARGET_STATUS,
      );
    }
    found.status = "COMPLETED";
    notifyRole(
      db,
      { restaurantId: found.restaurant_id, role: "ADMIN" },
      {
        title: "Production target ready to allocate",
        body: `${kitchen.name} completed the target for ${found.target_date}. Allocate it across branches.`,
        entityType: "production_target",
        entityId: found.id,
      },
    );
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  /**
   * ALLOCATED → DISPATCHED. Ships the allocated quantities; every allocation row
   * flips to DISPATCHED so it surfaces on the branches' Incoming screens.
   * Status-only in the mock — debiting kitchen stock is the real backend's job.
   */
  async dispatchProductionTarget(id: string): Promise<ProductionTarget> {
    const me = requireAuth();
    requireKitchenManager(me);
    const db = loadDb();
    const kitchen = resolveMyKitchen(db, me);
    const found = requireMyTarget(db, kitchen, id);
    if (found.status !== "ALLOCATED") {
      throw new ApiError(
        `Cannot dispatch a ${found.status.toLowerCase()} target.`,
        409,
        INVALID_TARGET_STATUS,
      );
    }
    found.status = "DISPATCHED";
    found.allocations = (found.allocations ?? []).map((a) => ({
      ...a,
      status: "DISPATCHED" as const,
    }));
    // Tell each branch that has goods coming.
    for (const branchId of new Set((found.allocations ?? []).map((a) => a.branch_id))) {
      notifyRole(
        db,
        { restaurantId: found.restaurant_id, role: "BRANCH_MANAGER", branchId },
        {
          title: "Goods dispatched to your branch",
          body: `${kitchen.name} dispatched a production target. Confirm receipt on Incoming.`,
          entityType: "production_target",
          entityId: found.id,
        },
      );
    }
    saveDb(db);
    return delay(toPublicTarget(found));
  },

  // ---- Branch (Phase 5) ----

  async listBranchStaff(): Promise<BranchStaff[]> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    return delay(
      db.employees
        .filter((e) => e.branch_id === branch.id && e.role === "BRANCH_STAFF")
        .map((e) => ({
          id: e.id,
          email: e.email,
          full_name: e.full_name ?? null,
          position: (e.position as BranchPosition | undefined) ?? null,
          phone_number: e.phone_number ?? null,
          address: e.address ?? null,
          image_url: e.image_url ?? null,
          cnic_front_url: e.cnic_front_url ?? null,
          cnic_back_url: e.cnic_back_url ?? null,
          is_active: e.is_active,
          branch_id: branch.id,
          created_at: e.created_at,
        })),
    );
  },

  async createBranchStaff(body: CreateBranchStaffInput): Promise<CreateBranchStaffResult> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    if (db.users.some((u) => u.email.toLowerCase() === body.email.toLowerCase())) {
      throw new ApiError("A user with this email already exists", 409);
    }

    const password = randomPassword();
    const id = `emp-${Date.now()}`;

    db.employees.push({
      id,
      restaurant_id: branch.restaurant_id,
      email: body.email,
      full_name: body.full_name ?? "",
      role: "BRANCH_STAFF",
      is_active: true,
      branch_id: branch.id,
      position: body.position,
      phone_number: body.phone_number?.trim() || null,
      address: body.address?.trim() || null,
      image_url: body.image_url || null,
      cnic_front_url: body.cnic_front_url || null,
      cnic_back_url: body.cnic_back_url || null,
      created_at: now(),
    } as MockEmployee);

    // A staff member who can't sign in isn't staff. The mock mints a working
    // account for the same reason the live server does. Position and its derived
    // capabilities ride on `/auth/me` so a created CHEF routes and gates exactly
    // like a seeded one.
    db.users.push({
      email: body.email,
      password,
      me: {
        id: Date.now(),
        email: body.email,
        full_name: body.full_name ?? null,
        role: "BRANCH_STAFF",
        restaurant_id: 1,
        created_by_id: me.id,
        is_active: true,
        position: body.position,
        branch_id: 1,
        capabilities: capabilitiesForPosition(body.position),
      },
    });

    saveDb(db);
    return delay({
      user_id: id,
      email: body.email,
      position: body.position,
      temporary_password: password,
      credential_email_sent: false,
    });
  },

  async revokeBranchStaff(id: string): Promise<BranchStaff> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const emp = db.employees.find((e) => e.id === id && e.branch_id === branch.id);
    if (!emp) throw new ApiError("Staff not found", 404);
    emp.is_active = false;
    const user = db.users.find((u) => u.email.toLowerCase() === emp.email.toLowerCase());
    if (user) user.me.is_active = false;
    saveDb(db);
    return delay({
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name || null,
      position: (emp as any).position ?? null,
      is_active: false,
      branch_id: branch.id,
    });
  },

  async restoreBranchStaff(id: string): Promise<BranchStaff> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const emp = db.employees.find((e) => e.id === id && e.branch_id === branch.id);
    if (!emp) throw new ApiError("Staff not found", 404);
    emp.is_active = true;
    const user = db.users.find((u) => u.email.toLowerCase() === emp.email.toLowerCase());
    if (user) user.me.is_active = true;
    saveDb(db);
    return delay({
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name || null,
      position: (emp as any).position ?? null,
      is_active: true,
      branch_id: branch.id,
    });
  },

  async deleteBranchStaff(id: string): Promise<void> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const emp = db.employees.find((e) => e.id === id && e.branch_id === branch.id);
    if (!emp) throw new ApiError("Staff not found", 404);
    db.employees = db.employees.filter((e) => e !== emp);
    db.users = db.users.filter((u) => u.email.toLowerCase() !== emp.email.toLowerCase());
    saveDb(db);
    return delay(undefined as never, 300);
  },

  async updateBranchStaff(id: string, body: UpdateBranchStaffInput): Promise<BranchStaff> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const emp = db.employees.find((e) => e.id === id && e.branch_id === branch.id);
    if (!emp) throw new ApiError("Staff not found", 404);
    const user = db.users.find((u) => u.email.toLowerCase() === emp.email.toLowerCase());
    if (body.email !== undefined) {
      const newEmail = body.email.trim().toLowerCase();
      emp.email = newEmail;
      if (user) { user.email = newEmail; user.me.email = newEmail; }
    }
    if (body.full_name !== undefined) {
      emp.full_name = body.full_name;
      if (user) user.me.full_name = body.full_name;
    }
    if (body.position !== undefined) {
      (emp as MockEmployee).position = body.position;
      // Position drives routing + capabilities, so a switch (e.g. to/from CHEF)
      // must follow through to the login the next `/auth/me` reads.
      if (user) {
        user.me.position = body.position;
        user.me.capabilities = capabilitiesForPosition(body.position);
      }
    }
    if (body.phone_number !== undefined) emp.phone_number = body.phone_number.trim() || null;
    if (body.address !== undefined) emp.address = body.address.trim() || null;
    if (body.image_url !== undefined) emp.image_url = body.image_url || null;
    if (body.cnic_front_url !== undefined) emp.cnic_front_url = body.cnic_front_url || null;
    if (body.cnic_back_url !== undefined) emp.cnic_back_url = body.cnic_back_url || null;
    saveDb(db);
    return delay({
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name || null,
      position: (emp as any).position ?? null,
      phone_number: emp.phone_number ?? null,
      address: emp.address ?? null,
      image_url: emp.image_url ?? null,
      cnic_front_url: emp.cnic_front_url ?? null,
      cnic_back_url: emp.cnic_back_url ?? null,
      is_active: emp.is_active,
      branch_id: branch.id,
    });
  },

  async listBranchCustomers(filters?: BranchCustomerFilters): Promise<Paginated<BranchCustomer>> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    // Strictly equal, no `OR IS NULL`. A customer with no branch is not "mine".
    let rows = db.customers.filter((c) => c.branch_id === branch.id && c.deleted_at === null);

    const search = filters?.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.phone ?? "").replace(/\s/g, "").includes(search.replace(/\s/g, "")),
      );
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 50;
    const start = (page - 1) * pageSize;

    return delay({
      items: rows.slice(start, start + pageSize).map(toPublicCustomer),
      page,
      page_size: pageSize,
      total: rows.length,
    });
  },

  async getBranchCustomer(id: string): Promise<BranchCustomer> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    return delay(toPublicCustomer(findMyCustomer(db, branch.id, id)));
  },

  async createBranchCustomer(body: CreateBranchCustomerInput): Promise<BranchCustomer> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const customer: MockCustomer = {
      id: `cust-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      // From the token's branch, never from the body — the input type has no
      // `branch_id` field at all, so there is nothing here to trust.
      branch_id: branch.id,
      name: body.name,
      phone: body.phone?.trim() || null,
      created_at: now(),
      deleted_at: null,
    };

    db.customers.push(customer);
    saveDb(db);
    return delay(toPublicCustomer(customer));
  },

  async updateBranchCustomer(
    id: string,
    body: UpdateBranchCustomerInput,
  ): Promise<BranchCustomer> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const found = findMyCustomer(db, branch.id, id);

    if (body.name !== undefined) found.name = body.name;
    if (body.phone !== undefined) found.phone = body.phone?.trim() || null;

    saveDb(db);
    return delay(toPublicCustomer(found));
  },

  async deleteBranchCustomer(id: string): Promise<void> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const found = findMyCustomer(db, branch.id, id);

    // Soft. Past orders keep pointing at this row; it just stops being
    // attachable to a new one.
    found.deleted_at = now();
    saveDb(db);
    return delay(undefined);
  },

  async listBranchOrders(filters?: BranchOrderFilters): Promise<Paginated<BranchOrder>> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const rows = db.branch_orders
      .filter((o) => o.branch_id === branch.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 50;
    const start = (page - 1) * pageSize;

    return delay({
      items: rows.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: rows.length,
    });
  },

  async createBranchOrder(body: CreateBranchOrderInput): Promise<BranchOrder> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    if (!body.lines.length) throw new ApiError("An order needs at least one line", 422);

    // Another branch's customer is a 404, not a 403 — the same rule as
    // `findMyCustomer`, and the leak the live server closed in Phase 5.
    if (body.customer_id) findMyCustomer(db, branch.id, body.customer_id);

    const mismatches: Array<Record<string, string>> = [];
    const lines = body.lines.map((line, i) => {
      const product = db.products.find((p) => p.id === line.product_id);
      if (!product) throw new ApiError("Product not found", 404);

      // The server prices. `selling_price` isn't on the mock's product shape
      // yet (it arrives with the Admin pricing delta), so cost_price stands in
      // as the authoritative number here — the *contract* being exercised is
      // "the client's proposal is checked and may be rejected", which is what
      // the UI has to get right.
      const serverPrice = product.cost_price ?? "0.00";

      if (line.unit_price && line.unit_price !== serverPrice) {
        mismatches.push({
          product_id: product.id,
          product_name: product.name,
          proposed_unit_price: line.unit_price,
          server_unit_price: serverPrice,
        });
      }

      const total = (parseFloat(serverPrice) * line.quantity).toFixed(2);
      return {
        id: `bol-${Date.now()}-${i}`,
        product_id: product.id,
        product_name: product.name,
        quantity: line.quantity,
        unit_price: serverPrice,
        line_total: total,
      };
    });

    // One 409 listing EVERY mismatched line — a stale client has a stale
    // snapshot, plural, and round-tripping it line by line is miserable.
    if (mismatches.length) {
      throw new ApiError("Prices have changed", 409, "price_mismatch", { lines: mismatches });
    }

    const order: MockBranchOrder = {
      id: `bord-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      branch_id: branch.id,
      customer_id: body.customer_id ?? null,
      customer_name: body.customer_id
        ? (db.customers.find((c) => c.id === body.customer_id)?.name ?? null)
        : null,
      lines,
      total: lines.reduce((sum, l) => sum + parseFloat(l.line_total), 0).toFixed(2),
      note: body.note ?? null,
      created_at: now(),
    };

    db.branch_orders.push(order);
    saveDb(db);
    return delay(order);
  },

  // ---- Stock requests (BRANCH_TO_ADMIN) ----
  //
  // The branch's outgoing ask to head office. Both roles may read; only the
  // manager may raise one. Seeded rows carry only `from_label` (no
  // `source_location_id`), so a request counts as this branch's when its source
  // matches the branch id OR, absent that, its label matches the branch name.

  async listBranchKitchens(): Promise<Kitchen[]> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    // Every kitchen in the branch's restaurant is a valid fulfilment target.
    return delay(db.kitchens.filter((k) => k.restaurant_id === branch.restaurant_id));
  },

  async listBranchRequests(filters?: RequestFilters): Promise<Paginated<StockRequest>> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    let rows = db.requests
      .filter(
        (r) =>
          r.type === "BRANCH_TO_ADMIN" &&
          r.restaurant_id === branch.restaurant_id &&
          (r.source_location_id === branch.id ||
            (r.source_location_id == null && r.from_label === branch.name)),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (filters?.status && filters.status !== "all") {
      rows = rows.filter((r) => r.status === filters.status);
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.page_size ?? 20;
    const start = (page - 1) * pageSize;

    return delay({
      items: rows.slice(start, start + pageSize).map(toPublicRequest),
      page,
      page_size: pageSize,
      total: rows.length,
    });
  },

  async createBranchRequest(body: CreateBranchRequestInput): Promise<StockRequest> {
    const me = requireAuth();
    requireBranchManager(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const lines = body.lines ?? [];
    if (lines.length === 0) {
      throw new ApiError("At least one line is required", 422);
    }
    for (const line of lines) {
      if (!Number.isInteger(line.quantity_requested) || line.quantity_requested <= 0) {
        throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
      }
    }

    // The branch picks which kitchen should fulfil it. Admin still approves and
    // forwards; this records the branch's chosen destination up front.
    const kitchen = db.kitchens.find(
      (k) => k.id === body.kitchen_id && k.restaurant_id === branch.restaurant_id,
    );
    if (!kitchen) throw new ApiError("Kitchen not found", 404);

    const id = `req-${Date.now()}`;
    const created: MockStockRequest = {
      id,
      restaurant_id: branch.restaurant_id,
      type: "BRANCH_TO_ADMIN",
      status: "PENDING",
      notes: body.notes ?? null,
      from_label: branch.name,
      created_at: now(),
      updated_at: now(),
      requester_id: typeof me.id === "number" ? me.id : null,
      assignee_id: null,
      source_location_type: "BRANCH",
      source_location_id: branch.id,
      // The branch's chosen kitchen. Admin can confirm or re-route on forward.
      target_location_type: "KITCHEN",
      target_location_id: kitchen.id,
      line_items: lines.map((line, index) => ({
        id: `${id}-l${index + 1}`,
        product_id: line.product_id,
        product_name:
          db.products.find((p) => p.id === line.product_id)?.name ?? "Unknown product",
        quantity_requested: line.quantity_requested,
        // Admin sets this when it approves; PENDING carries none.
        quantity_approved: null,
      })),
    };
    db.requests.push(created);

    saveDb(db);
    return delay(toPublicRequest(created));
  },

  async receiveBranchRequest(requestId: string): Promise<StockRequest> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const req = db.requests.find(
      (r) =>
        r.id === requestId &&
        r.type === "BRANCH_TO_ADMIN" &&
        r.source_location_id === branch.id,
    );
    if (!req) throw new ApiError("Request not found", 404);
    if (req.status !== "DISPATCHED") {
      throw new ApiError("Request is not dispatched", 409, "invalid_status");
    }

    req.status = "RECEIVED";
    req.updated_at = now();

    for (const line of req.line_items) {
      const pid = line.product_id ?? "";
      const qty = line.quantity_approved ?? line.quantity_requested;
      const product = db.products.find((p) => p.id === pid);
      const existing = db.inventory.find(
        (inv) =>
          inv.product_id === pid &&
          inv.location_id === branch.id &&
          inv.location_type === "BRANCH",
      );
      if (existing) {
        existing.quantity += qty;
      } else {
        db.inventory.push({
          id: `binv-${Date.now()}-${line.id}`,
          restaurant_id: branch.restaurant_id,
          product_id: pid,
          product: { id: pid, name: product?.name ?? line.product_name ?? "Unknown", sku: product?.sku ?? null },
          quantity: qty,
          batch_code: "",
          expiry_date: null,
          location_type: "BRANCH",
          location_id: branch.id,
        });
      }
    }

    saveDb(db);
    return delay(toPublicRequest(req));
  },

  async listBranchDeliveries(): Promise<BranchDelivery[]> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    // Flatten every dispatch request's allocations down to the ones aimed at this
    // branch that have actually left the kitchen. Newest request first.
    const deliveries: BranchDelivery[] = [];
    const requests = db.requests
      .filter((r) => r.type === "KITCHEN_TO_ADMIN" && r.restaurant_id === branch.restaurant_id)
      .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));

    for (const req of requests) {
      for (const a of req.allocations ?? []) {
        if (a.branch_id !== branch.id) continue;
        if (a.status !== "DISPATCHED" && a.status !== "RECEIVED") continue;
        deliveries.push({
          id: a.id,
          request_id: req.id,
          from_label: req.from_label ?? "Kitchen",
          product_id: a.product_id ?? "",
          product_name: a.product_name,
          quantity: a.quantity,
          status: a.status,
          created_at: req.updated_at ?? req.created_at,
        });
      }
    }

    // Production targets dispatched to this branch land on the same screen — a
    // delivery is a delivery, whatever raised it. Their allocation ids are
    // `<target>-a<n>`, distinct from the request flow's `alloc-*`, so the
    // receive handler can tell them apart.
    for (const target of db.production_targets) {
      if (target.restaurant_id !== branch.restaurant_id) continue;
      for (const a of target.allocations ?? []) {
        if (a.branch_id !== branch.id) continue;
        if (a.status !== "DISPATCHED" && a.status !== "RECEIVED") continue;
        deliveries.push({
          id: a.id,
          request_id: target.id,
          from_label: target.kitchen_name,
          product_id: a.product_id ?? "",
          product_name: a.product_name,
          quantity: a.quantity,
          status: a.status,
          created_at: target.created_at,
        });
      }
    }
    return delay(deliveries);
  },

  async receiveBranchDelivery(deliveryId: string): Promise<BranchDelivery> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    // A production-target allocation? (id shape `<target>-a<n>`.) These are
    // status-only in the mock — the real backend credits branch stock here.
    const targetDelivery = receiveTargetDelivery(db, branch, deliveryId);
    if (targetDelivery) {
      saveDb(db);
      return delay(targetDelivery);
    }

    // Find the allocation this delivery id points at, scoped to this branch.
    let owner: MockStockRequest | undefined;
    let alloc: RequestBranchAllocation | undefined;
    for (const req of db.requests) {
      if (req.type !== "KITCHEN_TO_ADMIN") continue;
      const match = (req.allocations ?? []).find(
        (a) => a.id === deliveryId && a.branch_id === branch.id,
      );
      if (match) {
        owner = req;
        alloc = match;
        break;
      }
    }
    if (!owner || !alloc) throw new ApiError("Delivery not found", 404);
    if (alloc.status !== "DISPATCHED") {
      throw new ApiError(`This delivery is ${alloc.status.toLowerCase()}, not awaiting receipt.`, 409);
    }

    // Credit the branch, then mark this allocation received.
    applyDeliveryToBranchStock(db, branch, alloc.product_id ?? "", alloc.product_name, alloc.quantity);
    alloc.status = "RECEIVED";

    // The request is fully received only once every branch has confirmed.
    if ((owner.allocations ?? []).every((a) => a.status === "RECEIVED")) {
      owner.status = "RECEIVED";
    }
    owner.updated_at = now();
    saveDb(db);

    return delay({
      id: alloc.id,
      request_id: owner.id,
      from_label: owner.from_label ?? "Kitchen",
      product_id: alloc.product_id ?? "",
      product_name: alloc.product_name,
      quantity: alloc.quantity,
      status: "RECEIVED",
      created_at: owner.updated_at ?? owner.created_at,
    });
  },

  async listBranchInventory(): Promise<BranchInventoryItem[]> {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    return delay(branchInventoryRows(db, branch.id));
  },

  async wasteBranchStock(body: BranchWasteInput) {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const movementType = body.movement_type ?? "WASTE";
    if (movementType !== "WASTE" && movementType !== "EXPIRY") {
      throw new ApiError(
        "Movement type must be WASTE or EXPIRY",
        409,
        INVALID_MOVEMENT_TYPE,
      );
    }

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }

    const batch = body.batch_code?.trim() ?? "";
    const item = db.inventory.find(
      (i) =>
        i.location_type === "BRANCH" &&
        i.location_id === branch.id &&
        i.product_id === body.product_id &&
        i.batch_code === batch,
    );
    if (!item) throw new ApiError("Stock not found", 404);

    if (quantity > item.quantity) {
      throw new ApiError(
        `Only ${item.quantity} on hand for this batch`,
        409,
        INSUFFICIENT_STOCK,
      );
    }

    item.quantity -= quantity;

    // Persist the write-off for the branch's Waste & expired log.
    db.waste_events.push({
      id: `waste-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      product_id: item.product_id,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
      },
      quantity,
      movement_type: movementType,
      waste_reason: body.waste_reason ?? null,
      batch_code: item.batch_code,
      notes: body.notes?.trim() || null,
      location_type: "BRANCH",
      location_id: branch.id,
      created_at: now(),
      created_by: me.full_name ?? me.email,
    });

    saveDb(db);

    // Product-level waste can touch several lots on the live API; the mock's
    // branch stock is one row per product, so it returns that single affected
    // row — but as an array, matching the new response shape.
    const today = now().slice(0, 10);
    const result: BranchInventoryItem = {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product.name,
      sku: item.product.sku ?? null,
      quantity: item.quantity,
      batch_code: item.batch_code ?? "",
      expiry_date: item.expiry_date ?? null,
      is_expired: item.expiry_date != null && item.expiry_date < today,
      stock_unit:
        db.products.find((p) => p.id === item.product_id)?.stock_unit ?? "EACH",
      location_id: item.location_id,
    };
    return delay([result]);
  },

  async listBranchWasteEvents(filters?: WasteEventFilters) {
    const me = requireAuth();
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const events = db.waste_events
      .filter(
        (e) =>
          e.restaurant_id === branch.restaurant_id &&
          e.location_type === "BRANCH" &&
          e.location_id === branch.id,
      )
      .filter((e) => !filters?.movement_type || e.movement_type === filters.movement_type)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toPublicWasteEvent);
    return delay(events);
  },

  // ---- Sub-kitchen prep board ----

  async listPrepBoard(filters?: PrepBoardFilters): Promise<Paginated<PrepTicket>> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 50;

    const all = db.prep_tickets
      .filter((t) => t.branch_id === branch.id)
      .filter((t) =>
        filters?.status
          ? t.status === filters.status
          : OPEN_PREP_STATUSES.includes(t.status),
      )
      .sort(sortPrepTickets);

    const start = (page - 1) * page_size;
    const items = all.slice(start, start + page_size).map(toPublicPrepTicket);
    const result: Paginated<PrepTicket> = { items, page, page_size, total: all.length };
    return delay(result);
  },

  async getPrepTicket(id: string): Promise<PrepTicket> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const ticket = db.prep_tickets.find((t) => t.id === id && t.branch_id === branch.id);
    if (!ticket) throw new ApiError("Ticket not found", 404);
    return delay(toPublicPrepTicket(ticket));
  },

  async createBatchJob(body: CreateBatchInput): Promise<PrepTicket> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }
    const product = db.products.find((p) => matchesProductId(p.id, body.product_id));
    if (!product) throw new ApiError("Product not found", 404);

    const ticket: MockPrepTicket = {
      id: `prep-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      branch_id: branch.id,
      source: "BATCH",
      status: "QUEUED",
      product_id: product.id,
      product_name: product.name,
      quantity,
      customization_note: body.customization_note?.trim() || null,
      note: body.note?.trim() || null,
      order_id: null,
      order_line_id: null,
      production_run_id: null,
      recipe_id: null,
      priority: Number(body.priority ?? 0),
      due_at: body.due_at ?? null,
      started_at: null,
      ready_at: null,
      completed_at: null,
      cancelled_at: null,
      created_at: now(),
      create_batch_code: body.batch_code ?? null,
      create_expiry_date: body.expiry_date ?? null,
    };
    db.prep_tickets.push(ticket);
    saveDb(db);
    return delay(toPublicPrepTicket(ticket), 300);
  },

  async updatePrepStatus(id: string, body: UpdatePrepStatusInput): Promise<PrepTicket> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const ticket = db.prep_tickets.find((t) => t.id === id && t.branch_id === branch.id);
    if (!ticket) throw new ApiError("Ticket not found", 404);

    // COMPLETED moves stock — it can't be set here.
    if ((body.status as string) === "COMPLETED") {
      throw new ApiError(
        "Use the complete action to finish a ticket.",
        409,
        PREP_USE_COMPLETE_ENDPOINT,
      );
    }
    if (!isPrepOpen(ticket.status)) {
      throw new ApiError("This ticket is already closed.", 409, PREP_NOT_OPEN);
    }
    if (!isPrepTransitionAllowed(ticket.status, body.status)) {
      throw new ApiError(
        `Cannot move from ${ticket.status} to ${body.status}.`,
        409,
        PREP_INVALID_TRANSITION,
      );
    }

    ticket.status = body.status;
    if (body.status === "IN_PROGRESS" && !ticket.started_at) ticket.started_at = now();
    if (body.status === "READY") ticket.ready_at = now();
    if (body.status === "CANCELLED") ticket.cancelled_at = now();
    saveDb(db);
    return delay(toPublicPrepTicket(ticket), 300);
  },

  async completePrepTicket(id: string, body?: CompleteTicketInput): Promise<PrepTicket> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const ticket = db.prep_tickets.find((t) => t.id === id && t.branch_id === branch.id);
    if (!ticket) throw new ApiError("Ticket not found", 404);
    if (!isPrepOpen(ticket.status)) {
      throw new ApiError("This ticket is already closed.", 409, PREP_NOT_OPEN);
    }

    // Components come from hand-stated `inputs`, or from the product's active
    // recipe when none are given. No recipe and no inputs → nothing to consume.
    const inputs = body?.inputs ?? [];
    let resolved: { productId: string; name: string; quantity: number }[];
    if (inputs.length > 0) {
      resolved = inputs.map((line) => {
        const product = db.products.find((p) => matchesProductId(p.id, line.product_id));
        if (!product) throw new ApiError("Input product not found", 404);
        return { productId: product.id, name: product.name, quantity: Number(line.quantity) };
      });
    } else {
      const recipe = db.sub_kitchen_recipes.find(
        (r) =>
          r.branch_id === branch.id &&
          r.is_active &&
          matchesProductId(ticket.product_id, r.product_id),
      );
      if (!recipe) {
        throw new ApiError(
          "No recipe and no inputs given — enter what was used.",
          409,
          POS_ERROR.NO_ACTIVE_RECIPE,
        );
      }
      const batches = Math.ceil(ticket.quantity / (recipe.yield_qty || 1));
      resolved = recipe.components.map((c) => {
        const product = db.products.find((p) =>
          matchesProductId(p.id, c.component_product_id),
        );
        if (!product) throw new ApiError("Recipe component not found", 404);
        const from = c.unit ?? c.stock_unit ?? "EACH";
        const to = c.stock_unit ?? from;
        const perBatch = tryConvertQty(c.quantity, from, to) ?? c.quantity;
        return { productId: product.id, name: product.name, quantity: perBatch * batches };
      });
    }
    for (const line of resolved) {
      const onHand = db.inventory
        .filter(
          (i) =>
            i.location_type === "BRANCH" &&
            i.location_id === branch.id &&
            i.product_id === line.productId,
        )
        .reduce((sum, i) => sum + i.quantity, 0);
      if (onHand < line.quantity) {
        throw new ApiError(
          `Not enough ${line.name} — ${onHand} on hand, ${line.quantity} needed.`,
          409,
          "insufficient_stock",
        );
      }
    }
    for (const line of resolved) {
      let remaining = line.quantity;
      for (const item of db.inventory) {
        if (remaining <= 0) break;
        if (
          item.location_type !== "BRANCH" ||
          item.location_id !== branch.id ||
          item.product_id !== line.productId
        ) {
          continue;
        }
        const take = Math.min(item.quantity, remaining);
        item.quantity -= take;
        remaining -= take;
      }
    }

    // A BATCH job adds the finished item back to branch stock; an ORDER goes to
    // the guest, so nothing is credited.
    if (ticket.source === "BATCH") {
      const batchCode = body?.batch_code ?? ticket.create_batch_code ?? "";
      const expiry = body?.expiry_date ?? ticket.create_expiry_date ?? null;
      const existing = db.inventory.find(
        (i) =>
          i.location_type === "BRANCH" &&
          i.location_id === branch.id &&
          i.product_id === ticket.product_id &&
          (i.batch_code || "") === batchCode &&
          (i.expiry_date || null) === expiry,
      );
      if (existing) {
        existing.quantity += ticket.quantity;
      } else {
        const product = db.products.find((p) => p.id === ticket.product_id);
        db.inventory.push({
          id: `inv-${Date.now()}-${ticket.product_id}`,
          restaurant_id: branch.restaurant_id,
          product_id: ticket.product_id,
          product: { id: ticket.product_id, name: product?.name ?? ticket.product_name, sku: product?.sku ?? null },
          quantity: ticket.quantity,
          batch_code: batchCode,
          expiry_date: expiry,
          location_type: "BRANCH",
          location_id: branch.id,
        });
      }
    }

    ticket.status = "COMPLETED";
    ticket.completed_at = now();
    ticket.production_run_id = `prod-${Date.now()}`;
    saveDb(db);
    return delay(toPublicPrepTicket(ticket), 400);
  },

  async cancelPrepTicket(id: string): Promise<PrepTicket> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const ticket = db.prep_tickets.find((t) => t.id === id && t.branch_id === branch.id);
    if (!ticket) throw new ApiError("Ticket not found", 404);
    if (!isPrepOpen(ticket.status)) {
      throw new ApiError("This ticket is already closed.", 409, PREP_NOT_OPEN);
    }
    ticket.status = "CANCELLED";
    ticket.cancelled_at = now();
    saveDb(db);
    return delay(toPublicPrepTicket(ticket), 300);
  },

  // ---- Sub-kitchen products (recipe pickers) ----

  async listSubKitchenProducts(
    filters?: SubKitchenProductFilters,
  ): Promise<SubKitchenProduct[]> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    // Ingredients (RAW_MATERIAL) are scoped to what the branch has actually held
    // — offering flour it can never get would let the chef save a recipe that
    // always fails. Finished goods are never scoped (a made-to-order dish is
    // never stocked, so scoping would hide the very item you're writing a recipe
    // for), and `all` widens the ingredients list to the full catalogue.
    const bypassScope = filters?.kind === "FINISHED_GOOD" || filters?.all === true;
    const held = new Set(
      db.inventory
        .filter((i) => i.location_type === "BRANCH" && i.location_id === branch.id)
        .map((i) => i.product_id),
    );

    return delay(
      db.products
        .filter(
          (p) =>
            p.restaurant_id === branch.restaurant_id &&
            (!filters?.kind || p.kind === filters.kind) &&
            (bypassScope || held.has(p.id)),
        )
        .map((p) => ({
          // The endpoint's `id` is a real product id — the numeric portion here,
          // mirroring the wire's integer ids.
          id: String(Number(String(p.id).replace(/\D/g, "")) || 0),
          name: p.name,
          sku: p.sku ?? null,
          kind: p.kind,
          stock_unit: p.stock_unit ?? "EACH",
          units_per_pack: p.units_per_pack ?? null,
          pack_size: null,
        })),
    );
  },

  // ---- Sub-kitchen recipes ----

  async listSubKitchenRecipes(): Promise<SubKitchenRecipe[]> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    return delay(
      db.sub_kitchen_recipes
        .filter((r) => r.branch_id === branch.id && r.is_active && r.made_at === "BRANCH")
        .map(toPublicSkRecipe),
    );
  },

  async getSubKitchenRecipe(id: string): Promise<SubKitchenRecipe> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const recipe = db.sub_kitchen_recipes.find(
      (r) => r.id === id && r.branch_id === branch.id,
    );
    if (!recipe) throw new ApiError("Recipe not found", 404);
    return delay(toPublicSkRecipe(recipe));
  },

  async createSubKitchenRecipe(
    body: CreateSubKitchenRecipeInput,
  ): Promise<SubKitchenRecipe> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const product = db.products.find((p) => matchesProductId(p.id, body.product_id));
    if (!product) throw new ApiError("Product not found", 404);
    if (product.kind === "RAW_MATERIAL") {
      throw new ApiError(
        "A raw material can't have a recipe.",
        409,
        POS_ERROR.PRODUCT_CANNOT_HAVE_RECIPE,
      );
    }

    // Republishing retires the current version and bumps the number.
    const prev = db.sub_kitchen_recipes.find(
      (r) =>
        r.branch_id === branch.id &&
        r.is_active &&
        matchesProductId(product.id, r.product_id),
    );
    if (prev) prev.is_active = false;

    const recipe: MockSubKitchenRecipe = {
      id: `skr-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      branch_id: branch.id,
      product_id: Number(String(product.id).replace(/\D/g, "")) || 0,
      product_name: product.name,
      version: (prev?.version ?? 0) + 1,
      is_active: true,
      yield_qty: Number(body.yield_qty ?? 1),
      note: body.note ?? null,
      made_at: "BRANCH",
      components: body.components.map((c) => {
        const comp = db.products.find((p) => matchesProductId(p.id, c.component_product_id));
        return {
          component_product_id: c.component_product_id,
          component_name: comp?.name,
          quantity: Number(c.quantity),
          wastage_bp: Number(c.wastage_bp ?? 0),
          stock_unit: comp?.stock_unit ?? "EACH",
          unit: c.unit,
        };
      }),
      created_at: now(),
    };
    db.sub_kitchen_recipes.push(recipe);
    saveDb(db);
    return delay(toPublicSkRecipe(recipe), 400);
  },

  // ---- Sub-kitchen waste (same branch ledger) ----

  async logSubKitchenWaste(body: BranchWasteInput): Promise<BranchInventoryItem> {
    const me = requireAuth();
    requirePrepOperate(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const movementType = body.movement_type ?? "WASTE";
    if (movementType !== "WASTE" && movementType !== "EXPIRY") {
      throw new ApiError("Movement type must be WASTE or EXPIRY", 409, INVALID_MOVEMENT_TYPE);
    }
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError("Quantity must be greater than 0", 409, INVALID_QUANTITY);
    }

    const batch = body.batch_code?.trim() ?? "";
    const item = db.inventory.find(
      (i) =>
        i.location_type === "BRANCH" &&
        i.location_id === branch.id &&
        i.product_id === body.product_id &&
        i.batch_code === batch,
    );
    if (!item) throw new ApiError("Stock not found", 404);
    if (quantity > item.quantity) {
      throw new ApiError(`Only ${item.quantity} on hand for this batch`, 409, "insufficient_stock");
    }
    item.quantity -= quantity;

    db.waste_events.push({
      id: `waste-${Date.now()}`,
      restaurant_id: branch.restaurant_id,
      product_id: item.product_id,
      product: { id: item.product.id, name: item.product.name, sku: item.product.sku },
      quantity,
      movement_type: movementType,
      waste_reason: body.waste_reason ?? null,
      batch_code: item.batch_code,
      notes: body.notes?.trim() || null,
      location_type: "BRANCH",
      location_id: branch.id,
      created_at: now(),
      created_by: me.full_name ?? me.email,
    });
    saveDb(db);

    const product = db.products.find((p) => p.id === item.product_id);
    const result: BranchInventoryItem = {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product.name,
      sku: item.product.sku ?? null,
      quantity: item.quantity,
      batch_code: item.batch_code,
      expiry_date: item.expiry_date ?? null,
      stock_unit: product?.stock_unit ?? "EACH",
      location_id: branch.id,
    };
    return delay(result, 300);
  },

  async listSubKitchenWaste(filters?: WasteEventFilters): Promise<WasteEvent[]> {
    const me = requireAuth();
    requirePrepOperate(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    return delay(
      db.waste_events
        .filter(
          (e) =>
            e.restaurant_id === branch.restaurant_id &&
            e.location_type === "BRANCH" &&
            e.location_id === branch.id &&
            (!filters?.movement_type || e.movement_type === filters.movement_type),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(toPublicWasteEvent),
    );
  },

  // ---- Stats ----

  async getSubKitchenStats(filters?: SubKitchenStatsFilters): Promise<SubKitchenStats> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);
    const { start, end } = statsWindow(filters);
    const inWindow = (iso: string | null) =>
      !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) <= end;

    const tickets = db.prep_tickets.filter((t) => t.branch_id === branch.id);
    const completedInWindow = tickets.filter(
      (t) => t.status === "COMPLETED" && inWindow(t.completed_at),
    );
    const createdInWindow = tickets.filter((t) => inWindow(t.created_at));

    const tickets_created: Record<PrepStatus, number> = {
      QUEUED: 0,
      IN_PROGRESS: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const t of createdInWindow) tickets_created[t.status] += 1;

    const wasteEvents = db.waste_events.filter(
      (e) =>
        e.location_type === "BRANCH" &&
        e.location_id === branch.id &&
        inWindow(e.created_at),
    );

    const stats: SubKitchenStats = {
      start,
      end,
      items_prepped: completedInWindow.reduce((sum, t) => sum + t.quantity, 0),
      tickets_completed: completedInWindow.length,
      waste_events: wasteEvents.length,
      waste_quantity: wasteEvents.reduce((sum, e) => sum + e.quantity, 0),
      // Null in mock mode: order-sourced tickets only exist on the live POS path.
      avg_order_to_ready_seconds: null,
      open_tickets: tickets.filter((t) => OPEN_PREP_STATUSES.includes(t.status)).length,
      tickets_created,
    };
    return delay(stats);
  },

  // ---- Stock the station works from ----

  async listSubKitchenInventory(): Promise<BranchInventoryItem[]> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    return delay(branchInventoryRows(db, branch.id));
  },

  async listSubKitchenNearExpiry(
    filters?: SubKitchenNearExpiryFilters,
  ): Promise<BranchInventoryItem[]> {
    const me = requireAuth();
    requirePrepStation(me);
    const db = loadDb();
    const branch = resolveMyBranch(db, me);

    const within = filters?.within_days ?? 7;
    const cutoff = new Date(Date.now() + within * 86_400_000).toISOString().slice(0, 10);
    return delay(
      db.inventory
        .filter(
          (i) =>
            i.location_type === "BRANCH" &&
            i.location_id === branch.id &&
            i.quantity > 0 &&
            i.expiry_date != null &&
            i.expiry_date <= cutoff,
        )
        .sort((a, b) => (a.expiry_date ?? "").localeCompare(b.expiry_date ?? ""))
        .map((i) => {
          const product = db.products.find((p) => p.id === i.product_id);
          return {
            id: i.id,
            product_id: i.product_id,
            product_name: i.product.name,
            sku: i.product.sku ?? null,
            quantity: i.quantity,
            batch_code: i.batch_code,
            expiry_date: i.expiry_date ?? null,
            stock_unit: product?.stock_unit ?? "EACH",
            location_id: branch.id,
          };
        }),
    );
  },
};
