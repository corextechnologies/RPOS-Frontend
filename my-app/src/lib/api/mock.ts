/**
 * Mock Super Admin API — in-memory backend persisted to localStorage.
 */
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
  UpdateProductPricingInput,
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
import { defaultNextBillingDate, planAmountForTier, planByTier } from "@/lib/plans/catalog";
import { tokens } from "./tokens";

const DB_KEY = "ros-super-admin-mock-db";
const SESSION_KEY = "ros-super-admin-session";
const SEED_VERSION = 10;

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
}

const now = () => new Date().toISOString();

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
  return db.invoices
    .filter((i) => i.restaurant_id === restaurantId)
    .sort((a, b) => b.issued_on.localeCompare(a.issued_on))
    .map((i) => ({
      id: String(i.id),
      amount: i.amount,
      issued_on: i.issued_on,
      paid: i.paid,
    }));
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
    created_at: now(),
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
    created_at: now(),
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
    created_at: now(),
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
    const restaurant: Restaurant = {
      id,
      name: body.name,
      plan_tier: tier,
      plan_status: "active",
      branch_limit: body.branch_limit ?? planByTier(tier)?.branchLimit ?? 1,
      branch_count: body.branch_limit ?? 1,
      plan_amount:
        body.plan_amount != null ? String(body.plan_amount) : planAmountForTier(tier) ?? null,
      next_billing_date: body.next_billing_date ?? defaultNextBillingDate(),
      admin: {
        id: adminId,
        name: body.owner_name ?? "",
        email: body.owner_email || adminEmail,
        phone: body.owner_phone ?? "",
        access_status: "active",
      },
      created_at: now(),
      updated_at: now(),
    };

    db.restaurants.push(restaurant);

    const nextBilling = addMonths(new Date(), 1).toISOString().slice(0, 10);
    const nextInvoiceId = db.invoices.reduce((max, i) => Math.max(max, i.id), 0) + 1;
    db.invoices.push({
      id: nextInvoiceId,
      restaurant_id: id,
      amount:
        body.plan_amount != null
          ? String(body.plan_amount)
          : planAmountForTier(tier) ?? "199.00",
      issued_on: nextBilling,
      paid: false,
    });

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
    const summary: BillingSummary = {
      restaurant_id: r.id,
      plan_tier: r.plan_tier,
      plan_status: r.plan_status,
      plan_amount: r.plan_amount ?? planAmountForTier(r.plan_tier) ?? "0",
      next_billing_date: r.next_billing_date ?? addMonths(new Date(), 1).toISOString().slice(0, 10),
      invoices: invoicesForRestaurant(db, restaurantId),
    };
    return delay(summary);
  },

  async getMyBilling() {
    const me = requireAuth();
    const db = loadDb();
    const restaurant = db.restaurants.find((r) => r.admin.email === me.email);
    if (!restaurant) throw new ApiError("Restaurant not found", 404);
    const summary: BillingSummary = {
      restaurant_id: restaurant.id,
      plan_tier: restaurant.plan_tier,
      plan_status: restaurant.plan_status,
      plan_amount: restaurant.plan_amount ?? planAmountForTier(restaurant.plan_tier) ?? "0",
      next_billing_date:
        restaurant.next_billing_date ?? addMonths(new Date(), 1).toISOString().slice(0, 10),
      invoices: invoicesForRestaurant(db, restaurant.id),
    };
    return delay(summary);
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
};
