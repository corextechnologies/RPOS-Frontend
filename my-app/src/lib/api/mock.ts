/**
 * Mock Super Admin API — in-memory backend persisted to localStorage.
 */
import {
  ApiError,
  PLAN_AMOUNTS,
  type BillingSummary,
  type CreateRestaurantInput,
  type CreateRestaurantResult,
  type Invoice,
  type MeResponse,
  type PlanTier,
  type Restaurant,
  type RestaurantFilters,
  type RestaurantStats,
  type TokenResponse,
  type UpdateRestaurantInput,
} from "@/lib/types/super-admin";
import type { ApiClient } from "./contract";
import { tokens } from "./tokens";

const DB_KEY = "ros-super-admin-mock-db";
const SESSION_KEY = "ros-super-admin-session";
const SEED_VERSION = 1;

const SUPER_ADMIN_EMAIL = "superadmin@ros.test";
const SUPER_ADMIN_PASSWORD = "Super@1234";

interface MockDb {
  _seed: number;
  restaurants: Restaurant[];
  invoices: Invoice[];
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

function seedDb(): MockDb {
  const r1: Restaurant = {
    id: "rest-001",
    name: "Demo Restaurant Group",
    plan_tier: "growth",
    plan_status: "active",
    branch_limit: 10,
    branch_count: 4,
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
    plan_tier: "starter",
    plan_status: "active",
    branch_limit: 3,
    branch_count: 2,
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

  const invoices: Invoice[] = [
    {
      id: "inv-001",
      restaurant_id: "rest-001",
      amount: PLAN_AMOUNTS.growth,
      billing_date: addMonths(new Date(), -2).toISOString().slice(0, 10),
      period: "Jan 2026",
      shared_with_admin: true,
      status: "paid",
    },
    {
      id: "inv-002",
      restaurant_id: "rest-001",
      amount: PLAN_AMOUNTS.growth,
      billing_date: addMonths(new Date(), -1).toISOString().slice(0, 10),
      period: "Feb 2026",
      shared_with_admin: false,
      status: "paid",
    },
    {
      id: "inv-003",
      restaurant_id: "rest-001",
      amount: PLAN_AMOUNTS.growth,
      billing_date: new Date().toISOString().slice(0, 10),
      period: "Mar 2026",
      shared_with_admin: false,
      status: "pending",
    },
    {
      id: "inv-004",
      restaurant_id: "rest-002",
      amount: PLAN_AMOUNTS.enterprise,
      billing_date: addMonths(new Date(), -1).toISOString().slice(0, 10),
      period: "Feb 2026",
      shared_with_admin: true,
      status: "overdue",
    },
    {
      id: "inv-005",
      restaurant_id: "rest-003",
      amount: PLAN_AMOUNTS.starter,
      billing_date: addMonths(new Date(), -1).toISOString().slice(0, 10),
      period: "Feb 2026",
      shared_with_admin: false,
      status: "paid",
    },
  ];

  return { _seed: SEED_VERSION, restaurants, invoices };
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
      id: "sa-1",
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      role: "super_admin",
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

export const mockClient: ApiClient = {
  async login(email, password) {
    if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
      const me: MeResponse = {
        id: "sa-1",
        name: "Super Admin",
        email: SUPER_ADMIN_EMAIL,
        role: "super_admin",
        is_active: true,
      };
      const tokens_: TokenResponse = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        token_type: "bearer",
      };
      tokens.set(tokens_.access_token, tokens_.refresh_token);
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(me));
      }
      return delay(tokens_);
    }
    throw new ApiError("Invalid email or password", 401);
  },

  async me() {
    return delay(requireAuth());
  },

  async logout() {
    tokens.clear();
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
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

    const restaurant: Restaurant = {
      id,
      name: body.name,
      plan_tier: body.plan_tier,
      plan_status: "active",
      branch_limit: Math.max(body.branch_count, 3),
      branch_count: body.branch_count,
      admin: {
        id: adminId,
        name: body.owner_name,
        email: body.owner_email || adminEmail,
        phone: body.owner_phone,
        access_status: "active",
      },
      created_at: now(),
      updated_at: now(),
    };

    db.restaurants.push(restaurant);

    const nextBilling = addMonths(new Date(), 1).toISOString().slice(0, 10);
    db.invoices.push({
      id: `inv-${Date.now()}`,
      restaurant_id: id,
      amount: PLAN_AMOUNTS[body.plan_tier as PlanTier],
      billing_date: nextBilling,
      period: new Date().toLocaleString("en-US", { month: "short", year: "numeric" }),
      shared_with_admin: false,
      status: "pending",
    });

    saveDb(db);

    const result: CreateRestaurantResult = {
      restaurant,
      credentials: {
        email: restaurant.admin.email,
        temporary_password: tempPassword,
        emailed: true,
      },
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
      plan_amount: PLAN_AMOUNTS[r.plan_tier],
      next_billing_date: addMonths(new Date(), 1).toISOString().slice(0, 10),
    };
    return delay(summary);
  },

  async listInvoices(restaurantId) {
    requireAuth();
    const db = loadDb();
    findRestaurant(db, restaurantId);
    return delay(
      db.invoices
        .filter((i) => i.restaurant_id === restaurantId)
        .sort((a, b) => b.billing_date.localeCompare(a.billing_date)),
    );
  },

  async shareInvoice(invoiceId) {
    requireAuth();
    const db = loadDb();
    const inv = db.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new ApiError("Invoice not found", 404);
    inv.shared_with_admin = true;
    saveDb(db);
    return delay({ ...inv });
  },

  async unshareInvoice(invoiceId) {
    requireAuth();
    const db = loadDb();
    const inv = db.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new ApiError("Invoice not found", 404);
    inv.shared_with_admin = false;
    saveDb(db);
    return delay({ ...inv });
  },
};
