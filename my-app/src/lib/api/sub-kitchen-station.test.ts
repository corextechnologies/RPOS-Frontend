import { beforeAll, describe, expect, it } from "vitest";

/**
 * The rest of the sub-kitchen station: completing a job by stating the
 * components used, stats, near-expiry, and the component picker. The prep-ticket
 * lifecycle itself is covered by `sub-kitchen-prep.test.ts`.
 *
 * The mock reads `window`/`localStorage`; the suite runs under `node`, so both
 * are stubbed before the module is imported.
 */

function installBrowserGlobals() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  Object.assign(globalThis, { window: {}, localStorage });
}

type MockClient = typeof import("./mock")["mockClient"];
let mockClient: MockClient;

const onHand = (rows: { product_id: string; quantity: number }[], id: string) =>
  rows.filter((r) => r.product_id === id).reduce((s, r) => s + r.quantity, 0);

beforeAll(async () => {
  installBrowserGlobals();
  ({ mockClient } = await import("./mock"));
  await mockClient.login("branch@demo.ros", "Demo@1234");
});

describe("sub-kitchen station", () => {
  it("completes a made-to-order ticket from the stated components", async () => {
    // prep-001 is 8× Burger. The chef states what was used at completion; each
    // component is deducted from branch stock. The finished item is credited
    // only because prep-001 is a legacy BATCH ticket.
    const before = await mockClient.listBranchInventory();
    const mozBefore = onHand(before, "prod-003");
    const sauceBefore = onHand(before, "prod-002");

    const done = await mockClient.completePrepTicket("prep-001", {
      inputs: [
        { product_id: 3, quantity: 0.4 }, // Mozzarella (prod-003)
        { product_id: 2, quantity: 8 }, // Tomato Sauce (prod-002)
      ],
    });
    expect(done.status).toBe("COMPLETED");

    const after = await mockClient.listBranchInventory();
    expect(onHand(after, "prod-003")).toBeCloseTo(mozBefore - 0.4, 5);
    expect(onHand(after, "prod-002")).toBe(sauceBefore - 8);
    expect(onHand(after, "prod-006")).toBe(8);
  });

  it("marks a ticket done with no deduction when no components are given", async () => {
    // Labour-only finish (e.g. writing a name): a fresh job completes with empty
    // inputs and consumes no components. (Left prep-002 open for the stats test.)
    const job = await mockClient.createBatchJob({ product_id: 7, quantity: 1 });
    const before = await mockClient.listBranchInventory();

    const done = await mockClient.completePrepTicket(job.id, { inputs: [] });
    expect(done.status).toBe("COMPLETED");

    const after = await mockClient.listBranchInventory();
    expect(onHand(after, "prod-002")).toBe(onHand(before, "prod-002"));
    expect(onHand(after, "prod-003")).toBe(onHand(before, "prod-003"));
  });

  it("reports stats and near-expiry stock", async () => {
    const stats = await mockClient.getSubKitchenStats();
    // prep-001 was completed above (8 burgers).
    expect(stats.tickets_completed).toBeGreaterThanOrEqual(1);
    expect(stats.items_prepped).toBeGreaterThanOrEqual(8);
    // prep-002 is still IN_PROGRESS.
    expect(stats.open_tickets).toBeGreaterThanOrEqual(1);
    // No order-sourced tickets in mock mode.
    expect(stats.avg_order_to_ready_seconds).toBeNull();

    const nearExpiry = await mockClient.listSubKitchenNearExpiry({ within_days: 7 });
    const ids = nearExpiry.map((r) => r.product_id);
    expect(ids).toContain("prod-003"); // Mozzarella expires in ~4 days
    expect(ids).not.toContain("prod-001"); // Coffee expires in ~28 days
  });

  it("scopes the ingredients picker to branch stock; `all` widens it", async () => {
    // Flour (prod-008) lives at the warehouse and has never reached the branch.
    const scoped = await mockClient.listSubKitchenProducts({ kind: "RAW_MATERIAL" });
    const scopedIds = scoped.map((p) => p.id);
    expect(scopedIds).toContain("3"); // Mozzarella — branch-held
    expect(scopedIds).not.toContain("8"); // Flour — never delivered

    const all = await mockClient.listSubKitchenProducts({ kind: "RAW_MATERIAL", all: true });
    expect(all.map((p) => p.id)).toContain("8");
  });

  it("never scopes the made-item picker, even with nothing on the shelf", async () => {
    // The branch holds no finished goods, but they're still valid products.
    const goods = await mockClient.listSubKitchenProducts({ kind: "FINISHED_GOOD" });
    const ids = goods.map((p) => p.id);
    expect(ids).toContain("6"); // Classic Burger
    expect(ids).toContain("7"); // Named Cake
  });

  it("writes off branch stock and records it in the history", async () => {
    // Napkins (prod-004) aren't touched by the completion test above.
    const before = await mockClient.listSubKitchenWaste();
    const stockBefore = await mockClient.listBranchInventory();

    await mockClient.logSubKitchenWaste({
      product_id: "prod-004",
      quantity: 5,
      movement_type: "WASTE",
      notes: "Damaged packs",
    });

    const after = await mockClient.listSubKitchenWaste();
    expect(after.length).toBe(before.length + 1);
    const logged = after.find((e) => e.product_id === "prod-004" && e.quantity === 5);
    expect(logged).toBeTruthy();

    const stockAfter = await mockClient.listBranchInventory();
    expect(onHand(stockAfter, "prod-004")).toBe(onHand(stockBefore, "prod-004") - 5);
  });
});
