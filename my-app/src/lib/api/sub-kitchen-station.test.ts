import { beforeAll, describe, expect, it } from "vitest";

/**
 * The rest of the sub-kitchen station: recipe-driven completion, recipe
 * versioning, 86-ing (sold out), stats, and near-expiry. The prep-ticket
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
  it("completes a ticket from its recipe when no inputs are given", async () => {
    // Seeded: prep-001 (8× Classic Burger) + recipe skr-001 (1 Mozzarella each).
    const before = await mockClient.listBranchInventory();
    const mozBefore = onHand(before, "prod-003"); // 9

    const done = await mockClient.completePrepTicket("prep-001");
    expect(done.status).toBe("COMPLETED");

    const after = await mockClient.listBranchInventory();
    // 8 burgers × 1 Mozzarella = 8 consumed; 8 burgers credited.
    expect(onHand(after, "prod-003")).toBe(mozBefore - 8);
    expect(onHand(after, "prod-006")).toBe(8);
  });

  it("republishes a recipe as a new version and retires the old", async () => {
    const created = await mockClient.createSubKitchenRecipe({
      product_id: 6,
      yield_qty: 1,
      components: [{ component_product_id: 3, quantity: 2 }],
    });
    expect(created.version).toBe(2);

    const active = await mockClient.listSubKitchenRecipes();
    const burgerRecipes = active.filter((r) => r.product_id === 6);
    // Only the new version is active.
    expect(burgerRecipes).toHaveLength(1);
    expect(burgerRecipes[0].version).toBe(2);
  });

  it("86s an item and reflects it in the availability list", async () => {
    const list = await mockClient.listSubKitchenAvailability();
    const cola = list.find((r) => r.menu_item_id === "prod-005"); // Bottled Cola
    expect(cola?.is_available).toBe(true);

    await mockClient.setSubKitchenAvailability("prod-005", {
      is_available: false,
      reason: "Out of cola",
    });

    const after = await mockClient.listSubKitchenAvailability();
    const colaAfter = after.find((r) => r.menu_item_id === "prod-005");
    expect(colaAfter?.is_available).toBe(false);
    expect(colaAfter?.reason).toBe("Out of cola");
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

    const nearExpiry = await mockClient.listBranchNearExpiry({ within_days: 7 });
    const ids = nearExpiry.map((r) => r.product_id);
    expect(ids).toContain("prod-003"); // Mozzarella expires in ~4 days
    expect(ids).not.toContain("prod-001"); // Coffee expires in ~28 days
  });
});
