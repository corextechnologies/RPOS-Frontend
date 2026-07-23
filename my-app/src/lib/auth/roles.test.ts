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

  it("sends warehouse staff to the warehouse portal with managers", () => {
    expect(portalPathForRole("WAREHOUSE_STAFF")).toBe("/warehouse/dashboard");
    expect(WAREHOUSE_PORTAL_ROLES).toEqual(["WAREHOUSE_MANAGER", "WAREHOUSE_STAFF"]);
    expect(isWarehousePortalRole("WAREHOUSE_STAFF")).toBe(true);
    expect(isWarehousePortalRole("WAREHOUSE_MANAGER")).toBe(true);
    expect(isWarehousePortalRole("ADMIN")).toBe(false);
  });
});

describe("warehouse staff capabilities", () => {
  it("allows inventory and requests but not staff provisioning", () => {
    expect(canPerform("WAREHOUSE_STAFF", "inventory:read")).toBe(true);
    expect(canPerform("WAREHOUSE_STAFF", "stock:receive")).toBe(true);
    expect(canPerform("WAREHOUSE_STAFF", "po:create")).toBe(true);
    expect(canPerform("WAREHOUSE_STAFF", "requests:update")).toBe(true);
    expect(canPerform("WAREHOUSE_STAFF", "staff:read")).toBe(false);
    expect(canPerform("WAREHOUSE_STAFF", "staff:create")).toBe(false);
  });

  it("keeps staff provisioning on the manager", () => {
    expect(canPerform("WAREHOUSE_MANAGER", "staff:read")).toBe(true);
    expect(canPerform("WAREHOUSE_MANAGER", "staff:create")).toBe(true);
  });
});
