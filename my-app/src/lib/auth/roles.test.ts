import { describe, expect, it } from "vitest";
import { canPerform } from "./actions";
import {
  BRANCH_PORTAL_ROLES,
  WAREHOUSE_PORTAL_ROLES,
  isWarehousePortalRole,
  portalPathForRole,
} from "./roles";

describe("role routing", () => {
  it("sends branch staff to POS, not the Branch Manager portal", () => {
    expect(portalPathForRole("BRANCH_STAFF")).toBe("/pos");
  });

  it("keeps the Branch portal manager-only", () => {
    expect(BRANCH_PORTAL_ROLES).toEqual(["BRANCH_MANAGER"]);
  });

  /**
   * Warehouse staff used to sign in and share this portal. They are personnel
   * records now — no account, no role — so the portal is manager-only, exactly
   * like Kitchen.
   */
  it("keeps the Warehouse portal manager-only", () => {
    expect(portalPathForRole("WAREHOUSE_MANAGER")).toBe("/warehouse/dashboard");
    expect(WAREHOUSE_PORTAL_ROLES).toEqual(["WAREHOUSE_MANAGER"]);
    expect(isWarehousePortalRole("WAREHOUSE_MANAGER")).toBe(true);
    expect(isWarehousePortalRole("ADMIN")).toBe(false);
  });
});

describe("warehouse capabilities", () => {

  it("keeps staff provisioning on the manager", () => {
    expect(canPerform("WAREHOUSE_MANAGER", "staff:read")).toBe(true);
    expect(canPerform("WAREHOUSE_MANAGER", "staff:create")).toBe(true);
  });
});
