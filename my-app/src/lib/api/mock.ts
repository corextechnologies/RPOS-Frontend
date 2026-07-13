/**
 * Mock Super Admin API — in-memory backend persisted to localStorage.
 */
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
} from "@/lib/types/super-admin";
import type { ApiClient } from "./contract";
import { apiConfig } from "./config";
import { defaultNextBillingDate, planAmountForTier, planByTier } from "@/lib/plans/catalog";
import { tokens } from "./tokens";

const DB_KEY = "ros-super-admin-mock-db";
const SESSION_KEY = "ros-super-admin-session";
const SEED_VERSION = 4;

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

interface MockDb {
  _seed: number;
  restaurants: Restaurant[];
  invoices: MockInvoiceRecord[];
  users: MockUserAccount[];
  resetTokens: Record<string, MockResetToken>;
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
    branch_limit: 10,
    branch_count: 4,
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

  return { _seed: SEED_VERSION, restaurants, invoices, users: seedUsers(), resetTokens: {} };
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
};
