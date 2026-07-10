/**
 * Mock adapter — a fully working in-memory backend persisted to localStorage.
 * Seeded to mirror RPOS-Backend/seed/*. Lets the entire Main Admin portal be
 * driven end-to-end before the real API is wired up. Flip NEXT_PUBLIC_USE_MOCK
 * to "false" to switch to the live backend (identical contract).
 */
import { ApiError } from "@/lib/types";
import type {
  Branch,
  MeResponse,
  Organization,
  Role,
  TokenResponse,
  User,
} from "@/lib/types";
import { tokens } from "./tokens";
import { ApiClient, MasterDataKey, MasterDataTypeMap } from "./contract";

const DB_KEY = "rpos-mock-db";
const SESSION_KEY = "rpos-mock-session";
const SEED_VERSION = 5;

const TEST_PASSWORD = "Test@1234";

const ORG_ID = "0b8f9c2a-1111-4a10-9c00-000000000001";
const ORG_ID_2 = "0b8f9c2a-1111-4a10-9c00-000000000002";
const BR_DOWNTOWN = "b1000000-0000-4000-8000-000000000001";
const BR_UPTOWN = "b1000000-0000-4000-8000-000000000002";
const BR_HUB = "b1000000-0000-4000-8000-000000000003";
const BR_DARK = "b1000000-0000-4000-8000-000000000004";

// RBAC catalog (mirrors seed/rbac_catalog.py)
const PERMISSIONS = [
  "master_data:read", "master_data:write", "organizations:read", "organizations:write",
  "branches:read", "branches:write", "users:read", "users:write", "roles:read",
  "roles:write", "permissions:assign", "inventory:read", "inventory:write",
  "finance:read", "finance:write", "production:read", "production:write",
  "production:approve", "orders:read", "orders:write", "reports:read",
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  "Super Admin": PERMISSIONS,
  "Finance Manager": ["master_data:read", "finance:read", "finance:write", "inventory:read", "reports:read"],
  "Inventory Manager": ["master_data:read", "inventory:read", "inventory:write", "branches:read", "reports:read"],
  "Store Manager": ["master_data:read", "inventory:read", "inventory:write", "branches:read"],
  "Procurement Officer": ["master_data:read", "inventory:read"],
  "Kitchen Manager": ["master_data:read", "production:read", "production:write", "production:approve"],
  "Kitchen Staff": ["production:read"],
  "Branch Manager": ["branches:read", "orders:read", "orders:write", "inventory:read", "reports:read"],
  "Cashier": ["orders:read", "orders:write"],
  "Supervisor": ["orders:read", "orders:write"],
  "Delivery Staff": ["orders:read"],
  "Auditor": ["master_data:read", "organizations:read", "branches:read", "users:read", "roles:read", "finance:read", "inventory:read", "production:read", "orders:read", "reports:read"],
  "Reports Viewer": ["branches:read", "reports:read"],
};
const ROLE_ORDER = Object.keys(ROLE_PERMISSIONS);

interface MockDb {
  _seed: number;
  organizations: Organization[];
  branches: Branch[];
  roles: Role[];
  users: (User & { password: string })[];
  masterData: Record<string, { id: number; [k: string]: unknown }[]>;
  counters: Record<string, number>;
}

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function seedDb(): MockDb {
  const roles: Role[] = ROLE_ORDER.map((name, i) => ({
    id: i + 1,
    name,
    permissions: [...ROLE_PERMISSIONS[name]].sort(),
  }));
  const roleId = (name: string) => roles.find((r) => r.name === name)!.id;

  const users: (User & { password: string })[] = [
    ["Super Admin", "admin@test.com", "Super Admin", null],
    ["Finance Manager", "finance@test.com", "Finance Manager", null],
    ["Inventory Manager", "inventory@test.com", "Inventory Manager", null],
    ["Store Manager", "store@test.com", "Store Manager", null],
    ["Kitchen Manager", "kitchen@test.com", "Kitchen Manager", null],
    ["Branch Manager", "branch@test.com", "Branch Manager", BR_DOWNTOWN],
    ["Cashier", "cashier@test.com", "Cashier", BR_DOWNTOWN],
    ["Auditor", "auditor@test.com", "Auditor", null],
  ].map(([name, email, role, branch], i) => ({
    id: i + 1,
    name: name as string,
    email: email as string,
    role_id: roleId(role as string),
    role_name: role as string,
    branch_id: branch as string | null,
    is_active: true,
    password: TEST_PASSWORD,
  }));

  const branch = (
    id: string,
    org: string,
    name: string,
    location: string,
    branch_type: Branch["branch_type"],
    tax: number | null,
  ): Branch => ({
    id,
    organization_id: org,
    name,
    location,
    branch_type,
    timings: [
      { day: "Mon-Fri", open: "09:00", close: "23:00" },
      { day: "Sat-Sun", open: "10:00", close: "00:00" },
    ],
    tax_percentage: tax,
    tax_percentage_online: tax !== null ? tax + 1 : null,
    latitude: null,
    longitude: null,
    delivery_type: branch_type === "dark_kitchen" ? "delivery_only" : "hybrid",
    geofence_placeholder: null,
    is_active: true,
    created_at: now(),
    updated_at: now(),
  });

  return {
    _seed: SEED_VERSION,
    organizations: [
      { id: ORG_ID, name: "Demo Restaurant Group", slug: "demo-restaurant-group", is_active: true, created_at: now(), updated_at: now() },
      { id: ORG_ID_2, name: "Layered Hospitality", slug: "layered-hospitality", is_active: false, created_at: now(), updated_at: now() },
    ],
    branches: [
      branch(BR_HUB, ORG_ID, "Central Production Hub", "Industrial Area, Sector 7", "hub", null),
      branch(BR_DOWNTOWN, ORG_ID, "Downtown Branch", "Main St", "branch", 16),
      branch(BR_UPTOWN, ORG_ID, "Uptown Branch", "5th Ave", "branch", 16),
      branch(BR_DARK, ORG_ID, "Riverside Dark Kitchen", "Wharf Rd", "dark_kitchen", 16),
    ],
    roles,
    users,
    masterData: {
      "master-data/units": [
        { id: 1, name: "Kilogram", symbol: "kg", effective_date: today() },
        { id: 2, name: "Gram", symbol: "g", effective_date: today() },
        { id: 3, name: "Litre", symbol: "L", effective_date: today() },
        { id: 4, name: "Millilitre", symbol: "ml", effective_date: today() },
        { id: 5, name: "Piece", symbol: "pc", effective_date: today() },
        { id: 6, name: "Box", symbol: "box", effective_date: today() },
      ],
      "master-data/categories": [
        { id: 1, name: "Flour & Grains", category_type: "raw_material", effective_date: today() },
        { id: 2, name: "Dairy", category_type: "raw_material", effective_date: today() },
        { id: 3, name: "Cakes", category_type: "product", effective_date: today() },
        { id: 4, name: "Beverages", category_type: "product", effective_date: today() },
        { id: 5, name: "Utilities", category_type: "expense", effective_date: today() },
      ],
      "master-data/taxes": [
        { id: 1, name: "Standard GST", tax_type: "GST", percentage: 16, branch_id: null, effective_date: today() },
        { id: 2, name: "Online Order Tax", tax_type: "GST", percentage: 17, branch_id: BR_DOWNTOWN, effective_date: today() },
      ],
      "master-data/storage-locations": [
        { id: 1, name: "Dry Store A", location_type: "central_store", branch_id: null, effective_date: today() },
        { id: 2, name: "Cold Room 1", location_type: "central_store", branch_id: null, effective_date: today() },
        { id: 3, name: "FG Freezer", location_type: "finished_goods", branch_id: null, effective_date: today() },
        { id: 4, name: "Downtown Backstore", location_type: "branch", branch_id: BR_DOWNTOWN, effective_date: today() },
      ],
      "master-data/packaging-types": [
        { id: 1, name: "1lb Cake Box", description: "Standard single-cake carton", effective_date: today() },
        { id: 2, name: "Insulated Pouch", description: "Cold-chain delivery pouch", effective_date: today() },
      ],
      "master-data/allergens": [
        { id: 1, name: "Gluten", effective_date: today() },
        { id: 2, name: "Dairy", effective_date: today() },
        { id: 3, name: "Nuts", effective_date: today() },
        { id: 4, name: "Eggs", effective_date: today() },
        { id: 5, name: "Soy", effective_date: today() },
      ],
      "master-data/reason-codes": [
        { id: 1, name: "Spillage", code: "WST-SPL", reason_type: "wastage", effective_date: today() },
        { id: 2, name: "Expired", code: "WST-EXP", reason_type: "wastage", effective_date: today() },
        { id: 3, name: "Damaged in transit", code: "REJ-DMG", reason_type: "rejection", effective_date: today() },
        { id: 4, name: "Count mismatch", code: "DSC-CNT", reason_type: "discrepancy", effective_date: today() },
      ],
      "master-data/temperature-ranges": [
        { id: 1, name: "Chilled / Dairy", min_celsius: 2, max_celsius: 5, effective_date: today() },
        { id: 2, name: "Frozen", min_celsius: -22, max_celsius: -18, effective_date: today() },
        { id: 3, name: "Ambient", min_celsius: 15, max_celsius: 25, effective_date: today() },
      ],
      "master-data/configuration-values": [
        { id: 1, key: "reorder_threshold_default", value: "10", value_type: "number", description: "Default reorder point (units)", effective_date: today() },
        { id: 2, key: "expense_auto_approve_limit", value: "5000", value_type: "number", description: "Auto-approve expenses under this amount", effective_date: today() },
        { id: 3, key: "safety_stock_buffer_pct", value: "12", value_type: "percentage", description: "Finished-goods safety stock buffer", effective_date: today() },
      ],
    },
    counters: {},
  };
}

function hasHeadOfficeRemnants(db: MockDb): boolean {
  return (
    db.roles.some((r) => r.name === "Head Office") ||
    db.users.some(
      (u) =>
        u.role_name === "Head Office" ||
        u.email.toLowerCase() === "headoffice@test.com",
    )
  );
}

function clearHeadOfficeSession() {
  if (typeof window === "undefined") return;
  const email = localStorage.getItem(SESSION_KEY);
  if (email?.toLowerCase() === "headoffice@test.com") {
    localStorage.removeItem(SESSION_KEY);
    tokens.clear();
  }
}

function load(): MockDb {
  if (typeof window === "undefined") return seedDb();
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed._seed === SEED_VERSION && !hasHeadOfficeRemnants(parsed)) return parsed;
    }
  } catch {}
  const fresh = seedDb();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  clearHeadOfficeSession();
  return fresh;
}

function save(db: MockDb) {
  if (typeof window !== "undefined") localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function nextId(db: MockDb, key: string, list: { id: number }[]): number {
  const max = list.reduce((m, r) => Math.max(m, r.id), 0);
  return max + 1;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Simulate network latency so loading states are visible/real.
const delay = <T>(v: T, ms = 260): Promise<T> =>
  new Promise((res) => setTimeout(() => res(v), ms));

function currentEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export const mockClient: ApiClient = {
  async login(email, password) {
    const db = load();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password || !user.is_active) {
      return delay(null, 350).then(() => {
        throw new ApiError("Invalid email or password", 401);
      });
    }
    localStorage.setItem(SESSION_KEY, user.email);
    const t: TokenResponse = {
      access_token: `mock.${btoa(user.email)}.${Date.now()}`,
      refresh_token: `mockrefresh.${btoa(user.email)}`,
      token_type: "bearer",
    };
    tokens.set(t.access_token, t.refresh_token);
    return delay(t, 500);
  },

  async me() {
    const db = load();
    const email = currentEmail();
    const user = email && db.users.find((u) => u.email === email);
    if (!user) throw new ApiError("Not authenticated", 401);
    const role = db.roles.find((r) => r.id === user.role_id);
    const res: MeResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      branch_id: user.branch_id,
      is_active: user.is_active,
      permissions: role ? role.permissions : [],
    };
    return delay(res, 180);
  },

  async logout() {
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    tokens.clear();
    return delay(undefined, 120);
  },

  async listOrganizations() {
    return delay([...load().organizations].sort((a, b) => a.name.localeCompare(b.name)));
  },
  async createOrganization(body) {
    const db = load();
    const org: Organization = {
      id: uuid(),
      name: String(body.name ?? "Untitled"),
      slug: String(body.slug ?? ""),
      is_active: body.is_active ?? true,
      created_at: now(),
      updated_at: now(),
    };
    db.organizations.push(org);
    save(db);
    return delay(org, 400);
  },
  async updateOrganization(id, body) {
    const db = load();
    const org = db.organizations.find((o) => o.id === id);
    if (!org) throw new ApiError("Organization not found", 404);
    Object.assign(org, body, { updated_at: now() });
    save(db);
    return delay(org, 400);
  },

  async listBranches() {
    return delay([...load().branches].sort((a, b) => a.name.localeCompare(b.name)));
  },
  async createBranch(body) {
    const db = load();
    const b: Branch = {
      id: uuid(),
      organization_id: String(body.organization_id ?? ORG_ID),
      name: String(body.name ?? "New Branch"),
      location: String(body.location ?? ""),
      branch_type: (body.branch_type as Branch["branch_type"]) ?? "branch",
      timings: (body.timings as Branch["timings"]) ?? [],
      tax_percentage: (body.tax_percentage as number) ?? null,
      tax_percentage_online: (body.tax_percentage_online as number) ?? null,
      latitude: (body.latitude as number) ?? null,
      longitude: (body.longitude as number) ?? null,
      delivery_type: (body.delivery_type as string) ?? null,
      geofence_placeholder: (body.geofence_placeholder as string) ?? null,
      is_active: body.is_active ?? true,
      created_at: now(),
      updated_at: now(),
    };
    db.branches.push(b);
    save(db);
    return delay(b, 400);
  },
  async updateBranch(id, body) {
    const db = load();
    const b = db.branches.find((x) => x.id === id);
    if (!b) throw new ApiError("Branch not found", 404);
    Object.assign(b, body, { updated_at: now() });
    save(db);
    return delay(b, 400);
  },

  async listUsers() {
    return delay(
      load().users
        .map(({ password, ...u }) => u)
        .sort((a, b) => a.id - b.id),
    );
  },
  async createUser(body) {
    const db = load();
    if (db.users.some((u) => u.email === body.email))
      throw new ApiError("Email already registered", 409);
    const role = db.roles.find((r) => r.id === Number(body.role_id));
    if (!role) throw new ApiError("Role not found", 404);
    const user = {
      id: nextId(db, "users", db.users),
      name: String(body.name),
      email: String(body.email),
      role_id: role.id,
      role_name: role.name,
      branch_id: (body.branch_id as string) ?? null,
      is_active: (body.is_active as boolean) ?? true,
      password: String(body.password ?? TEST_PASSWORD),
    };
    db.users.push(user);
    save(db);
    const { password, ...rest } = user;
    return delay(rest, 400);
  },
  async updateUser(id, body) {
    const db = load();
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new ApiError("User not found", 404);
    if (body.email && db.users.some((u) => u.email === body.email && u.id !== id))
      throw new ApiError("Email already registered", 409);
    if (body.role_id) {
      const role = db.roles.find((r) => r.id === Number(body.role_id));
      if (!role) throw new ApiError("Role not found", 404);
      user.role_name = role.name;
    }
    const { password, ...patch } = body as Record<string, unknown>;
    Object.assign(user, patch);
    if (password) user.password = String(password);
    save(db);
    const { password: _p, ...rest } = user;
    return delay(rest, 400);
  },

  async listRoles() {
    return delay([...load().roles].sort((a, b) => a.id - b.id));
  },
  async createRole(name) {
    const db = load();
    if (db.roles.some((r) => r.name === name))
      throw new ApiError("Role already exists", 409);
    const role: Role = { id: nextId(db, "roles", db.roles), name, permissions: [] };
    db.roles.push(role);
    save(db);
    return delay(role, 400);
  },
  async assignPermissions(roleId, codes) {
    const db = load();
    const role = db.roles.find((r) => r.id === roleId);
    if (!role) throw new ApiError("Role not found", 404);
    const unknown = codes.filter((c) => !PERMISSIONS.includes(c));
    if (unknown.length) throw new ApiError(`Unknown permissions: ${unknown.join(", ")}`, 404);
    role.permissions = [...codes].sort();
    save(db);
    return delay(role, 400);
  },

  async listMasterData<K extends MasterDataKey>(key: K) {
    const db = load();
    const list = (db.masterData[`master-data/${key}`] ?? []) as unknown as MasterDataTypeMap[K][];
    return delay([...list].sort((a: any, b: any) => a.id - b.id));
  },
  async createMasterData<K extends MasterDataKey>(key: K, body: Record<string, unknown>) {
    const db = load();
    const path = `master-data/${key}`;
    const list = db.masterData[path] ?? (db.masterData[path] = []);
    const record = {
      id: nextId(db, path, list),
      ...body,
      effective_date: (body.effective_date as string) || today(),
    };
    list.push(record);
    save(db);
    return delay(record as unknown as MasterDataTypeMap[K], 380);
  },
  async updateMasterData<K extends MasterDataKey>(
    key: K,
    id: number,
    body: Record<string, unknown>,
  ) {
    const db = load();
    const list = db.masterData[`master-data/${key}`] ?? [];
    const record = list.find((r) => r.id === id);
    if (!record) throw new ApiError("Record not found", 404);
    Object.assign(record, body);
    save(db);
    return delay(record as unknown as MasterDataTypeMap[K], 380);
  },
  async deleteMasterData<K extends MasterDataKey>(key: K, id: number) {
    const db = load();
    const path = `master-data/${key}`;
    db.masterData[path] = (db.masterData[path] ?? []).filter((r) => r.id !== id);
    save(db);
    return delay(undefined, 300);
  },
};
