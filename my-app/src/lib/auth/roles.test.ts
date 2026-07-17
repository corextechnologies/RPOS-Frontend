import { describe, expect, it } from "vitest";
import { BRANCH_PORTAL_ROLES, portalPathForRole } from "./roles";

describe("role routing", () => {
  it("sends branch staff to POS, not the Branch Manager portal", () => {
    expect(portalPathForRole("BRANCH_STAFF")).toBe("/pos");
  });

  it("keeps the Branch portal manager-only", () => {
    expect(BRANCH_PORTAL_ROLES).toEqual(["BRANCH_MANAGER"]);
  });
});
