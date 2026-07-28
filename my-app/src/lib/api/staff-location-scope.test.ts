import { beforeEach, describe, expect, it } from "vitest";

/**
 * Sub-staff are location-scoped, not creator-scoped.
 *
 * The backend changed the rule: a manager now manages every staff member at
 * their location, regardless of who originally created them (so a replacement
 * or co-manager inherits the whole roster instantly). This drives the mock,
 * which is the CONTRACT the UI is built against — the server enforces the same
 * rule independently. Before, a fresh manager saw zero staff; this test is what
 * makes a regression to that behavior visible.
 */

// The mock reads `window.localStorage`; treat its absence as "server-side" and
// it hands back a SUPER_ADMIN, useless here. So: a real-enough store.
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage, setTimeout, clearTimeout },
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });

const { mockClient } = await import("./mock");

const PASSWORD = "Demo@1234";
const ADMIN = "admin@demo-restaurant.ros";
const KITCHEN_MANAGER = "kitchen@demo.ros";

/** Seeded staff created by the ORIGINAL managers, not by our new co-managers. */
const SEEDED_WAREHOUSE_STAFF = "wh-staff@demo.ros";

beforeEach(() => {
  storage.clear();
});

/** Provision a second manager at an existing location and sign in as them. */
async function loginAsCoManager(opts: {
  email: string;
  role: "WAREHOUSE_MANAGER" | "KITCHEN_MANAGER";
  warehouse_id?: string;
  kitchen_id?: string;
}) {
  await mockClient.login(ADMIN, PASSWORD);
  const created = await mockClient.createUser({
    email: opts.email,
    full_name: "Second Manager",
    role: opts.role,
    warehouse_id: opts.warehouse_id,
    kitchen_id: opts.kitchen_id,
  });
  await mockClient.logout();
  await mockClient.login(opts.email, created.temporary_password ?? PASSWORD);
}

describe("warehouse staff roster is shared across managers", () => {
  it("a co-manager sees staff created by the original manager", async () => {
    await loginAsCoManager({
      email: "wh-co-manager@test.ros",
      role: "WAREHOUSE_MANAGER",
      warehouse_id: "wh-001",
    });

    const page = await mockClient.listWarehouseUsers();
    const emails = page.items.map((s) => s.email);

    // The whole point: staff they never created are now visible. Under the old
    // creator-scoped rule this list would have been empty.
    expect(emails).toContain(SEEDED_WAREHOUSE_STAFF);
    expect(page.items.length).toBeGreaterThan(0);
  });

  it("the roster contains only this warehouse's staff", async () => {
    await loginAsCoManager({
      email: "wh-co-manager@test.ros",
      role: "WAREHOUSE_MANAGER",
      warehouse_id: "wh-001",
    });

    const page = await mockClient.listWarehouseUsers();
    expect(page.items.every((s) => s.warehouse_id === "wh-001")).toBe(true);
    expect(page.items.every((s) => s.role === "WAREHOUSE_STAFF")).toBe(true);
  });
});

describe("kitchen staff roster is shared across managers", () => {
  it("a co-manager sees a staff member the original manager added", async () => {
    // Original manager adds a roster record (with the new fields).
    await mockClient.login(KITCHEN_MANAGER, PASSWORD);
    const created = await mockClient.createKitchenUser({
      email: "kitchen-staff@test.ros",
      full_name: "Priya Sharma",
      job_title: "Head Chef",
      phone_number: "+92 300 1234567",
    });
    // Roster records are personnel, not accounts: role is always KITCHEN_STAFF.
    expect(created.role).toBe("KITCHEN_STAFF");
    await mockClient.logout();

    // A different manager assigned to the same kitchen now inherits them.
    await loginAsCoManager({
      email: "kt-co-manager@test.ros",
      role: "KITCHEN_MANAGER",
      kitchen_id: "kit-001",
    });

    const page = await mockClient.listKitchenUsers();
    const row = page.items.find((s) => s.email === "kitchen-staff@test.ros");
    expect(row).toBeDefined();
    expect(row?.job_title).toBe("Head Chef");
    expect(row?.role).toBe("KITCHEN_STAFF");
    expect(page.items.every((s) => s.kitchen_id === "kit-001")).toBe(true);
  });
});
