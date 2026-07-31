import { beforeAll, describe, expect, it } from "vitest";
import { postAuthPath } from "@/lib/auth/routes";
import { isBranchChef, userHasCapability } from "@/lib/auth/capabilities";

/**
 * The branch CHEF: routed to the sub-kitchen (not the till), scoped by
 * capabilities. Verifies the shape `/auth/me` must carry and that the mock's
 * prep-station guard admits a chef for prep work but not the manager-only
 * waste / availability endpoints.
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

beforeAll(async () => {
  installBrowserGlobals();
  ({ mockClient } = await import("./mock"));
});

describe("branch chef routing + capabilities", () => {
  it("chef /auth/me carries position CHEF, prep capabilities, and routes to the sub-kitchen", async () => {
    await mockClient.login("chef@demo.ros", "Demo@1234");
    const me = await mockClient.me();

    expect(me.role).toBe("BRANCH_STAFF");
    expect(me.position).toBe("CHEF");
    expect(me.capabilities).toEqual(["INVENTORY_READ", "PREP_OPERATE", "PREP_READ"]);

    expect(isBranchChef(me)).toBe(true);
    expect(userHasCapability(me, "PREP_READ")).toBe(true);
    expect(userHasCapability(me, "PREP_OPERATE")).toBe(true);
    expect(userHasCapability(me, "WASTE_LOG")).toBe(false);

    expect(postAuthPath(me)).toBe("/branch/sub-kitchen");
  });

  it("chef can work the prep station but is refused manager-only endpoints", async () => {
    await mockClient.login("chef@demo.ros", "Demo@1234");

    // Prep read/operate is allowed.
    const board = await mockClient.listPrepBoard();
    expect(Array.isArray(board.items)).toBe(true);

    // Waste history + write-off and 86-ing stay manager-only.
    await expect(mockClient.listSubKitchenWaste()).rejects.toMatchObject({ status: 403 });
    await expect(
      mockClient.logSubKitchenWaste({ product_id: "prod-004", quantity: 1 }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(mockClient.listSubKitchenAvailability()).rejects.toMatchObject({ status: 403 });
  });

  it("manager carries the prep capabilities and is not a chef", async () => {
    await mockClient.login("branch@demo.ros", "Demo@1234");
    const me = await mockClient.me();

    expect(isBranchChef(me)).toBe(false);
    expect(userHasCapability(me, "PREP_READ")).toBe(true);
    expect(userHasCapability(me, "WASTE_LOG")).toBe(true);
    expect(postAuthPath(me)).toBe("/branch/dashboard");
  });

  it("non-branch roles report no capabilities (means N/A)", async () => {
    await mockClient.login("admin@demo-restaurant.ros", "Demo@1234");
    const me = await mockClient.me();

    expect(me.capabilities ?? []).toEqual([]);
    expect(isBranchChef(me)).toBe(false);
  });

  const STAFF_INPUT = {
    full_name: "Nadia Chef",
    phone_number: "+92 300 0000000",
    address: "1 Test Street, Lahore",
    image_url: "staff-photos/x.webp",
    cnic_front_url: "staff-cnic/f.webp",
    cnic_back_url: "staff-cnic/b.webp",
  };

  it("a manager creates a CHEF who then routes and gates like a seeded one", async () => {
    await mockClient.login("branch@demo.ros", "Demo@1234");
    const created = await mockClient.createBranchStaff({
      ...STAFF_INPUT,
      email: "nadia.chef@branch.com",
      position: "CHEF",
    });
    expect(created.position).toBe("CHEF");
    expect(created.temporary_password).toBeTruthy();

    // The new Chef shows up on the one branch roster.
    const roster = await mockClient.listBranchStaff();
    expect(
      roster.some((s) => s.email === "nadia.chef@branch.com" && s.position === "CHEF"),
    ).toBe(true);

    // …and signs in as a fully-wired Chef: position + prep capabilities + routing.
    await mockClient.login("nadia.chef@branch.com", created.temporary_password!);
    const me = await mockClient.me();
    expect(me.position).toBe("CHEF");
    expect(me.capabilities).toEqual(["INVENTORY_READ", "PREP_OPERATE", "PREP_READ"]);
    expect(isBranchChef(me)).toBe(true);
    expect(postAuthPath(me)).toBe("/branch/sub-kitchen");
  });

  it("switching a position to CHEF re-derives capabilities and routing", async () => {
    await mockClient.login("branch@demo.ros", "Demo@1234");
    const created = await mockClient.createBranchStaff({
      ...STAFF_INPUT,
      full_name: "Was A Cashier",
      email: "switch.chef@branch.com",
      position: "CASHIER",
    });
    // A cashier carries no prep capabilities.
    await mockClient.login("switch.chef@branch.com", created.temporary_password!);
    expect((await mockClient.me()).capabilities ?? []).toEqual([]);

    await mockClient.login("branch@demo.ros", "Demo@1234");
    await mockClient.updateBranchStaff(created.user_id, { position: "CHEF" });

    await mockClient.login("switch.chef@branch.com", created.temporary_password!);
    const me = await mockClient.me();
    expect(me.position).toBe("CHEF");
    expect(me.capabilities).toEqual(["INVENTORY_READ", "PREP_OPERATE", "PREP_READ"]);
    expect(postAuthPath(me)).toBe("/branch/sub-kitchen");
  });
});
