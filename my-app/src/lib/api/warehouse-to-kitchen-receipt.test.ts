import { beforeAll, describe, expect, it } from "vitest";

/**
 * When a kitchen receives a KITCHEN_TO_WAREHOUSE dispatch, the credited kitchen
 * stock must inherit the warehouse batch's code and expiry, and the inventory
 * projection must expose the product's kind (rendered as the "Category" column).
 *
 * Regression for: batch code, expiry, and category not flowing from the
 * warehouse into kitchen inventory on receipt.
 *
 * The mock backend reads `window`/`localStorage`; the suite runs under the
 * `node` environment, so both are stubbed before the module is imported.
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

beforeAll(async () => {
  installBrowserGlobals();
  ({ mockClient } = await import("./mock"));
});

describe("warehouse → kitchen receipt", () => {
  it("carries batch code, expiry, and category into kitchen inventory", async () => {
    // req-008 is a seeded, APPROVED KITCHEN_TO_WAREHOUSE request for prod-003
    // (Mozzarella Block, 5 approved) targeting wh-001, whose stock (inv-003)
    // holds batch B-MOZ-11 with an expiry.
    await mockClient.login("warehouse@demo.ros", "Demo@1234");
    await mockClient.updateWarehouseRequestStatus("req-008", {
      to_status: "DISPATCHED",
    });

    const batchQty = (items: Awaited<ReturnType<MockClient["listKitchenInventory"]>>) =>
      items
        .filter((i) => i.product_id === "prod-003" && i.batch_code === "B-MOZ-11")
        .reduce((sum, i) => sum + i.quantity, 0);

    // The kitchen confirms receipt, which credits its stock.
    await mockClient.login("kitchen@demo.ros", "Demo@1234");
    const before = batchQty(await mockClient.listKitchenInventory());
    await mockClient.updateKitchenRequestStatus("req-008", {
      to_status: "RECEIVED",
    });

    const inventory = await mockClient.listKitchenInventory();
    const received = inventory.find(
      (item) => item.product_id === "prod-003" && item.batch_code === "B-MOZ-11",
    );

    expect(received).toBeDefined();
    // Batch and expiry flowed from the warehouse row, not hardcoded empty.
    expect(received!.batch_code).toBe("B-MOZ-11");
    expect(received!.expiry_date).toBeTruthy();
    // The 5 approved units were credited to the matching batch, not a "" lump.
    expect(batchQty(inventory) - before).toBe(5);
    // Category (product kind) is resolved from the catalog on the projection.
    expect(received!.product.kind).toBeTruthy();
  });

  it("receives a seeded in-transit request with its recorded batch and expiry", async () => {
    // req-009 is seeded already DISPATCHED (prod-002, Tomato Sauce) and carries
    // the batch the warehouse sent. Receiving it must not fall back to an
    // unbatched lump.
    await mockClient.login("kitchen@demo.ros", "Demo@1234");
    await mockClient.updateKitchenRequestStatus("req-009", {
      to_status: "RECEIVED",
    });

    const inventory = await mockClient.listKitchenInventory();
    const received = inventory.find(
      (item) => item.product_id === "prod-002" && item.batch_code === "B-TOM-03",
    );

    expect(received).toBeDefined();
    expect(received!.expiry_date).toBeTruthy();
    expect(received!.product.kind).toBeTruthy();
  });

  it("splits a multi-batch dispatch into one kitchen row per batch (FEFO)", async () => {
    // The headline backend scenario: a request whose quantity spans two
    // warehouse batches must credit the kitchen with one row per batch, each
    // carrying its own code + expiry, drained earliest-expiry-first.
    const ymd = (days: number) =>
      new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    const earlyExpiry = ymd(3);
    const lateExpiry = ymd(30);

    await mockClient.login("warehouse@demo.ros", "Demo@1234");
    const product = await mockClient.createWarehouseProduct({
      name: "Test Greek Yogurt",
      kind: "RAW_MATERIAL",
      stock_unit: "KG",
    });
    await mockClient.receiveWarehouseStock({
      product_id: product.id,
      quantity: 6,
      batch_code: "B-EARLY",
      expiry_date: earlyExpiry,
    });
    await mockClient.receiveWarehouseStock({
      product_id: product.id,
      quantity: 10,
      batch_code: "B-LATE",
      expiry_date: lateExpiry,
    });

    // Kitchen requests 9 — 6 drawn from B-EARLY, 3 from B-LATE (FEFO).
    await mockClient.login("kitchen@demo.ros", "Demo@1234");
    const req = await mockClient.createKitchenWarehouseRequest({
      warehouse_id: "wh-001",
      lines: [{ product_id: product.id, quantity_requested: 9 }],
    });

    await mockClient.login("warehouse@demo.ros", "Demo@1234");
    await mockClient.updateWarehouseRequestStatus(req.id, { to_status: "APPROVED" });
    await mockClient.updateWarehouseRequestStatus(req.id, { to_status: "DISPATCHED" });

    await mockClient.login("kitchen@demo.ros", "Demo@1234");
    await mockClient.updateKitchenRequestStatus(req.id, { to_status: "RECEIVED" });

    const rows = (await mockClient.listKitchenInventory()).filter(
      (i) => i.product_id === product.id,
    );
    const byBatch = Object.fromEntries(rows.map((r) => [r.batch_code, r]));

    // Two distinct rows, each with the exact batch/expiry the warehouse sent.
    expect(rows).toHaveLength(2);
    expect(byBatch["B-EARLY"]?.quantity).toBe(6);
    expect(byBatch["B-EARLY"]?.expiry_date).toBe(earlyExpiry);
    expect(byBatch["B-LATE"]?.quantity).toBe(3);
    expect(byBatch["B-LATE"]?.expiry_date).toBe(lateExpiry);
    // Category flows on every row.
    for (const r of rows) expect(r.product.kind).toBe("RAW_MATERIAL");
  });
});
