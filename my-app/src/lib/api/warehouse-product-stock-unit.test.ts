import { beforeAll, describe, expect, it } from "vitest";

/**
 * A warehouse manager picks a unit of measure when adding a product; it must
 * persist on the catalog and surface on inventory rows for that product.
 *
 * Regression for: product creation had no unit field, so received stock showed
 * a bare count with no idea whether it was 5 kg or 5 cans.
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
  await mockClient.login("warehouse@demo.ros", "Demo@1234");
});

describe("warehouse product stock unit", () => {
  it("persists the chosen unit on create and lists it back", async () => {
    const created = await mockClient.createWarehouseProduct({
      name: "Basmati Rice",
      kind: "RAW_MATERIAL",
      stock_unit: "KG",
    });
    expect(created.stock_unit).toBe("KG");

    const products = await mockClient.listWarehouseProducts();
    const rice = products.find((p) => p.id === created.id);
    expect(rice?.stock_unit).toBe("KG");
  });

  it("defaults to EACH when the unit is omitted", async () => {
    const created = await mockClient.createWarehouseProduct({
      name: "Serviettes",
      kind: "RAW_MATERIAL",
    });
    expect(created.stock_unit).toBe("EACH");
  });

  it("surfaces the product's unit on its inventory rows", async () => {
    // Seeded prod-001 (Coffee Beans) is stocked in KG.
    const inventory = await mockClient.listWarehouseInventory();
    const coffee = inventory.find((i) => i.product_id === "prod-001");
    expect(coffee?.product.stock_unit).toBe("KG");
  });

  it("updates the unit via edit", async () => {
    const created = await mockClient.createWarehouseProduct({
      name: "Olive Oil",
      kind: "RAW_MATERIAL",
      stock_unit: "EACH",
    });
    const updated = await mockClient.updateWarehouseProduct(created.id, {
      stock_unit: "LITER",
    });
    expect(updated.stock_unit).toBe("LITER");
  });
});
