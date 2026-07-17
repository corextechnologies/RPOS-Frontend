import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/types/super-admin";

/**
 * Branch scoping.
 *
 * The backend's plan calls this out by name: *"the test that doesn't exist
 * today, which is why the bug shipped."* Two branches of one restaurant —
 * branch B's staff must never see branch A's customer, and must not be able to
 * attach one to an order.
 *
 * This drives the mock rather than the live API, which makes it a test of the
 * CONTRACT the UI is built against, not of the server. The server enforces the
 * same rules independently and is the authority; if the two ever disagree, this
 * test is what makes the disagreement visible instead of shipping.
 */

// The mock reads `window.localStorage` and treats its absence as "server-side",
// where it hands back a SUPER_ADMIN — useless here. So: a real-enough store.
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

const BRANCH_A_MANAGER = "branch@demo.ros";
const PASSWORD = "Demo@1234";

/** Seeded on br-002 — the branch our signed-in user does NOT belong to. */
const OTHER_BRANCH_CUSTOMER = "cust-003";

beforeEach(async () => {
  storage.clear();
  await mockClient.login(BRANCH_A_MANAGER, PASSWORD);
});

describe("customer list is scoped to the caller's branch", () => {
  it("returns this branch's customers", async () => {
    const page = await mockClient.listBranchCustomers();
    const names = page.items.map((c) => c.name).sort();
    expect(names).toEqual(["Ayesha Khan", "Hassan Raza"]);
  });

  /** The actual leak. One assertion, and the whole reason this file exists. */
  it("does NOT return another branch's customer", async () => {
    const page = await mockClient.listBranchCustomers();
    expect(page.items.map((c) => c.id)).not.toContain(OTHER_BRANCH_CUSTOMER);
    expect(page.items.every((c) => c.branch_id === "br-001")).toBe(true);
  });

  it("counts only this branch — a leak would inflate the total", async () => {
    const page = await mockClient.listBranchCustomers();
    expect(page.total).toBe(2);
  });

  it("searching cannot reach across branches", async () => {
    // "Bilal" exists, on br-002. Search must not be a way around the scope.
    const page = await mockClient.listBranchCustomers({ search: "Bilal" });
    expect(page.items).toEqual([]);
  });

  it("searches this branch by name and by phone", async () => {
    expect((await mockClient.listBranchCustomers({ search: "ayesha" })).items).toHaveLength(1);
    expect((await mockClient.listBranchCustomers({ search: "0321" })).items).toHaveLength(1);
  });
});

describe("fetching one customer", () => {
  it("finds one in this branch", async () => {
    const c = await mockClient.getBranchCustomer("cust-001");
    expect(c.name).toBe("Ayesha Khan");
    expect(c.branch_id).toBe("br-001");
  });

  /**
   * 404, not 403. A 403 would confirm the row exists, which is the same leak
   * wearing a different status code.
   */
  it("404s on another branch's customer rather than 403ing", async () => {
    await expect(mockClient.getBranchCustomer(OTHER_BRANCH_CUSTOMER)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("404s on a customer that never existed — same answer, no oracle", async () => {
    await expect(mockClient.getBranchCustomer("cust-nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("creating a customer", () => {
  it("takes the branch from the session, not the caller", async () => {
    const created = await mockClient.createBranchCustomer({ name: "New Person", phone: "0300 1" });
    expect(created.branch_id).toBe("br-001");
  });

  /**
   * `CreateBranchCustomerInput` has no `branch_id` field at all — this asserts
   * the hole stays closed even if someone widens the type later and forgets
   * why it was narrow.
   */
  it("ignores a branch_id smuggled into the body", async () => {
    const created = await mockClient.createBranchCustomer({
      name: "Smuggler",
      branch_id: "br-002",
    } as Parameters<typeof mockClient.createBranchCustomer>[0]);
    expect(created.branch_id).toBe("br-001");
  });

  it("shows up in this branch's list and nowhere else", async () => {
    await mockClient.createBranchCustomer({ name: "Fresh Face" });
    const page = await mockClient.listBranchCustomers();
    expect(page.items.map((c) => c.name)).toContain("Fresh Face");
    expect(page.total).toBe(3);
  });
});

describe("updating and deleting", () => {
  it("cannot update another branch's customer", async () => {
    await expect(
      mockClient.updateBranchCustomer(OTHER_BRANCH_CUSTOMER, { name: "Hacked" }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("cannot delete another branch's customer", async () => {
    await expect(mockClient.deleteBranchCustomer(OTHER_BRANCH_CUSTOMER)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("soft-deletes: the customer leaves the list", async () => {
    await mockClient.deleteBranchCustomer("cust-001");
    const page = await mockClient.listBranchCustomers();
    expect(page.items.map((c) => c.id)).not.toContain("cust-001");
  });

  it("a deleted customer can no longer be attached to an order", async () => {
    await mockClient.deleteBranchCustomer("cust-001");
    await expect(
      mockClient.createBranchOrder({
        customer_id: "cust-001",
        lines: [{ product_id: "prod-001", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("orders", () => {
  it("404s when given another branch's customer_id", async () => {
    await expect(
      mockClient.createBranchOrder({
        customer_id: OTHER_BRANCH_CUSTOMER,
        lines: [{ product_id: "prod-001", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("prices from the server when unit_price is omitted", async () => {
    const order = await mockClient.createBranchOrder({
      lines: [{ product_id: "prod-001", quantity: 2 }],
    });
    // prod-001 seeds at cost 18.50 — the mock's stand-in authority.
    expect(order.lines[0].unit_price).toBe("18.50");
    expect(order.total).toBe("37.00");
  });

  it("accepts a proposal that matches", async () => {
    const order = await mockClient.createBranchOrder({
      lines: [{ product_id: "prod-001", quantity: 1, unit_price: "18.50" }],
    });
    expect(order.total).toBe("18.50");
  });

  /**
   * The money test. A stale client proposing 1.00 for an 18.50 product must be
   * refused — and refused with the breakdown, not just a message.
   */
  it("409s on a mismatched proposal and names every bad line", async () => {
    const err = await mockClient
      .createBranchOrder({
        lines: [
          { product_id: "prod-001", quantity: 5, unit_price: "1.00" },
          { product_id: "prod-003", quantity: 1, unit_price: "1.00" },
        ],
      })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    const api = err as ApiError;
    expect(api.status).toBe(409);
    expect(api.code).toBe("price_mismatch");

    // Plural. A stale device has a stale snapshot, not one bad line.
    const details = api.details as { lines: Array<Record<string, string>> };
    expect(details.lines).toHaveLength(2);
    expect(details.lines[0]).toMatchObject({
      product_name: "House Blend Coffee Beans",
      proposed_unit_price: "1.00",
      server_unit_price: "18.50",
    });
  });

  it("writes no order when the proposal is rejected", async () => {
    await mockClient
      .createBranchOrder({ lines: [{ product_id: "prod-001", quantity: 5, unit_price: "1.00" }] })
      .catch(() => undefined);

    // All-or-nothing: a rejected order must leave no trace.
    expect((await mockClient.listBranchOrders()).total).toBe(0);
  });

  it("lists only this branch's orders", async () => {
    await mockClient.createBranchOrder({ lines: [{ product_id: "prod-001", quantity: 1 }] });
    const page = await mockClient.listBranchOrders();
    expect(page.total).toBe(1);
  });
});

describe("inventory", () => {
  /**
   * Structural, not cosmetic. The plan of record says price "must be
   * structurally absent from this view's data/component, not CSS-hidden", and a
   * recursive scan is how you prove it rather than assert it.
   */
  it("never carries cost_price anywhere in the payload", async () => {
    const rows = await mockClient.listBranchInventory();
    const scan = (v: unknown): string[] =>
      v && typeof v === "object"
        ? Object.entries(v as Record<string, unknown>).flatMap(([k, val]) =>
            k.toLowerCase().includes("cost") || k.toLowerCase().includes("price")
              ? [k]
              : scan(val),
          )
        : [];
    expect(scan(rows)).toEqual([]);
  });
});
