import { beforeAll, describe, expect, it } from "vitest";
import { createInputToApi, restaurantFromApi, updateInputToApi } from "./adapters";
import type { RestaurantOut } from "@/lib/types/super-admin";

/**
 * The has_central_kitchen flag: adapter defaults, mock persistence, and the
 * guarded disable. The mock backend reads window/localStorage; the suite runs
 * under node, so both are stubbed before the module is imported.
 */

describe("has_central_kitchen — adapter defaults", () => {
  const base: RestaurantOut = {
    id: 1,
    name: "X",
    admin_full_name: null,
    owner_contact_number: null,
    owner_contact_email: null,
    status: "ACTIVE",
    plan_tier: null,
    plan_amount: null,
    branch_limit: null,
    next_billing_date: null,
  };

  it("defaults a missing flag to true (backend not yet sending it)", () => {
    expect(restaurantFromApi(base).has_central_kitchen).toBe(true);
  });

  it("passes an explicit false through", () => {
    expect(
      restaurantFromApi({ ...base, has_central_kitchen: false }).has_central_kitchen,
    ).toBe(false);
  });

  it("create adapter defaults the flag to true when omitted", () => {
    const body = createInputToApi({
      name: "X",
      owner_email: "a@b.co",
      payment_received: false,
    });
    expect(body.has_central_kitchen).toBe(true);
  });

  it("update adapter includes the flag only when provided", () => {
    expect("has_central_kitchen" in updateInputToApi({})).toBe(false);
    expect(updateInputToApi({ has_central_kitchen: false }).has_central_kitchen).toBe(false);
  });
});

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

describe("has_central_kitchen — mock persistence + guarded disable", () => {
  it("persists the flag on create (false stays false, omitted defaults to true)", async () => {
    await mockClient.login("admin@demo-restaurant.ros", "Demo@1234");

    const off = await mockClient.createRestaurant({
      name: "No Kitchen Co",
      owner_email: "nokitchen@tenant.ros",
      branch_limit: 1,
      plan_tier: "standard",
      has_central_kitchen: false,
      payment_received: false,
    });
    expect(off.restaurant.has_central_kitchen).toBe(false);

    const on = await mockClient.createRestaurant({
      name: "Has Kitchen Co",
      owner_email: "haskitchen@tenant.ros",
      branch_limit: 1,
      plan_tier: "standard",
      payment_received: false,
    });
    expect(on.restaurant.has_central_kitchen).toBe(true);
  });

  it("blocks disabling while kitchen resources exist (rest-001)", async () => {
    await mockClient.login("admin@demo-restaurant.ros", "Demo@1234");
    await expect(
      mockClient.updateRestaurant("rest-001", { has_central_kitchen: false }),
    ).rejects.toMatchObject({ status: 409, code: "kitchen_in_use" });
  });

  it("allows disabling a clean restaurant and persists it (rest-003)", async () => {
    await mockClient.login("admin@demo-restaurant.ros", "Demo@1234");
    const updated = await mockClient.updateRestaurant("rest-003", {
      has_central_kitchen: false,
    });
    expect(updated.has_central_kitchen).toBe(false);
  });
});
