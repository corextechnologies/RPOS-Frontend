/**
 * Mock Super Admin API — in-memory backend persisted to localStorage.
 */
import type {
  AdminProfile,
  Branch,
  CreateAdminUserInput,
  CreateAdminUserResult,
  CreateLocationInput,
  Employee,
  Kitchen,
  Paginated,
  ProductPricing,
  RequestFilters,
  SalesRecord,
  SalesRecordFilters,
  CreateSaleInput,
  StockRequest,
  UpdateAdminProfileInput,
  UpdateAdminUserInput,
  UpdateLocationInput,
  UpdateProductPricingInput,
  UpdateRequestStatusInput,
  Warehouse,
} from "@/lib/types/admin";
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
  type UserRole,
} from "@/lib/types/super-admin";
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
const SEED_VERSION = 11;

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
}

interface MockProduct extends ProductPricing {
  restaurant_id: string;
}

interface MockStockRequest extends StockRequest {
  restaurant_id: string;
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
}

const now = () => new Date().toISOString();

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
      cost_price: "18.50",
    },
    {
      id: "prod-002",
      restaurant_id: "rest-001",
      name: "Tomato Sauce (Can)",
      sku: "ING-TOM-02",
      cost_price: null,
    },
    {
      id: "prod-003",
      restaurant_id: "rest-001",
      name: "Mozzarella Block",
      sku: "DAI-MOZ-10",
      cost_price: "9.75",
    },
    {
      id: "prod-004",
      restaurant_id: "rest-001",
      name: "Paper Napkins (Pack)",
      sku: "SUP-NAP-50",
      cost_price: null,
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
  };
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

function toPublicRequest(req: MockStockRequest): StockRequest {
  return {
    id: req.id,
    type: req.type,
    status: req.status,
    notes: req.notes,
    from_label: req.from_label,
    line_items: req.line_items,
    created_at: req.created_at,
    updated_at: req.updated_at,
  };
}

function paginateRequests(
  db: MockDb,
  restaurantId: string,
  type: StockRequest["type"],
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
      if (employee.role !== "WAREHOUSE_MANAGER") {
        throw new ApiError("warehouse_id is only valid for a warehouse manager", 409, "conflict");
      }
      const warehouse = db.warehouses.find(
        (w) => w.id === body.warehouse_id && w.restaurant_id === r.id,
      );
      if (!warehouse) throw new ApiError("Warehouse not found", 404);
      employee.warehouse_id = warehouse.id;
    }

    if (body.full_name !== undefined) employee.full_name = body.full_name.trim();
    if (body.is_active !== undefined) employee.is_active = body.is_active;

    const account = findUser(db, employee.email);
    if (account) {
      account.me = {
        ...account.me,
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

  async listProductPricing() {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const items: ProductPricing[] = db.products
      .filter((p) => p.restaurant_id === r.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        cost_price: p.cost_price,
      }));
    return delay(items);
  },

  async updateProductPricing(productId: string, body: UpdateProductPricingInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const product = db.products.find((p) => p.id === productId && p.restaurant_id === r.id);
    if (!product) throw new ApiError("Product not found", 404);

    const raw = typeof body.cost_price === "number" ? body.cost_price : Number(body.cost_price);
    if (!Number.isFinite(raw) || raw < 0) {
      throw new ApiError("cost_price must be 0 or greater", 400);
    }

    product.cost_price = raw.toFixed(2);
    saveDb(db);

    const result: ProductPricing = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      cost_price: product.cost_price,
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

  async getRequest(requestId) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.requests.find((req) => req.id === requestId && req.restaurant_id === r.id);
    if (!found) throw new ApiError("Request not found", 404);
    if (found.type !== "BRANCH_TO_ADMIN" && found.type !== "WAREHOUSE_TO_ADMIN_PO") {
      throw new ApiError("Request not found", 404);
    }
    return delay(toPublicRequest(found));
  },

  async updateRequestStatus(requestId: string, body: UpdateRequestStatusInput) {
    const me = requireAuth();
    const db = loadDb();
    const r = resolveMyRestaurant(db, me);
    const found = db.requests.find((req) => req.id === requestId && req.restaurant_id === r.id);
    if (!found) throw new ApiError("Request not found", 404);
    if (found.type !== "BRANCH_TO_ADMIN" && found.type !== "WAREHOUSE_TO_ADMIN_PO") {
      throw new ApiError("Request not found", 404);
    }

    const allowed = allowedTransitions(found.type, found.status);
    if (!allowed.includes(body.to_status)) {
      throw new ApiError(
        `Cannot transition from ${found.status} to ${body.to_status}`,
        400,
      );
    }

    if (body.to_status === "PARTIALLY_APPROVED") {
      const approvals = body.line_approvals ?? [];
      if (approvals.length === 0) {
        throw new ApiError("line_approvals are required for partial approval", 400);
      }
      for (const approval of approvals) {
        const line = found.line_items.find((item) => item.id === approval.line_id);
        if (!line) {
          throw new ApiError(`Line item ${approval.line_id} not found`, 400);
        }
        if (
          !Number.isFinite(approval.quantity_approved) ||
          approval.quantity_approved < 0 ||
          approval.quantity_approved > line.quantity_requested
        ) {
          throw new ApiError(
            `Invalid quantity_approved for line ${approval.line_id}`,
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
};
