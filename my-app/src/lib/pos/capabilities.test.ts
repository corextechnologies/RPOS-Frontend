import { describe, expect, it } from "vitest";
import {
  availablePaymentMethods,
  canTakeAnyPayment,
  canTakeCash,
  canTakeNonCash,
  explainNoCash,
  has,
  hasAll,
  hasAny,
} from "./capabilities";
import type { Capability, DeviceProfile, PosBootstrap } from "@/lib/types/pos";
import type { BranchPosition } from "@/lib/types/super-admin";

function bootstrap(
  caps: Capability[],
  profile: DeviceProfile = "COUNTER",
  position: BranchPosition | null = "CASHIER",
): PosBootstrap {
  return {
    branch: {
      id: 1,
      code: "BR0001",
      country_code: "PK",
      province_code: "PRA",
      currency: "PKR",
      timezone: "Asia/Karachi",
    },
    device: { id: 1, code: "T1", profile },
    user: { id: 9, role: "BRANCH_STAFF", position },
    pack: {
      version: "pk@stub-0pct",
      currency: "PKR",
      minor_units: 2,
      payment_methods: ["CASH", "CARD", "WALLET"],
      is_stub: true,
    },
    capabilities: caps,
    server_time: "2026-07-17T10:00:00Z",
  };
}

describe("capability predicates", () => {
  const caps: Capability[] = ["ORDER_CREATE", "PAYMENT_CASH"];

  it("reads a flat list", () => {
    expect(has(caps, "ORDER_CREATE")).toBe(true);
    expect(has(caps, "REFUND")).toBe(false);
  });

  it("combines", () => {
    expect(hasAny(caps, "REFUND", "PAYMENT_CASH")).toBe(true);
    expect(hasAny(caps, "REFUND", "VOID_AFTER_SEND")).toBe(false);
    expect(hasAll(caps, "ORDER_CREATE", "PAYMENT_CASH")).toBe(true);
    expect(hasAll(caps, "ORDER_CREATE", "REFUND")).toBe(false);
  });

  it("ignores capabilities it has never heard of rather than crashing", () => {
    expect(has(["SOME_FUTURE_CAP"] as Capability[], "SOME_FUTURE_CAP")).toBe(true);
    expect(has(["SOME_FUTURE_CAP"] as Capability[], "ORDER_CREATE")).toBe(false);
  });

  it("fails closed on an empty list", () => {
    expect(has([], "ORDER_CREATE")).toBe(false);
    expect(canTakeAnyPayment(bootstrap([]))).toBe(false);
  });
});

/**
 * The rule the backend's own plan flags as the one people get wrong:
 * "A CASHIER on a curbside tablet still can't take cash — there's no drawer."
 * The axis is capability ∩ device, never position alone.
 */
describe("cash is gated by device, not just by person", () => {
  it("lets a cashier on a counter take cash", () => {
    expect(canTakeCash(bootstrap(["PAYMENT_CASH"], "COUNTER", "CASHIER"))).toBe(true);
  });

  it("refuses cash on curbside even for a cashier holding PAYMENT_CASH", () => {
    const b = bootstrap(["PAYMENT_CASH"], "CURBSIDE", "CASHIER");
    expect(canTakeCash(b)).toBe(false);
    expect(explainNoCash(b)).toContain("no cash drawer");
  });

  it("refuses cash to an order-taker on a counter", () => {
    const b = bootstrap(["ORDER_CREATE"], "COUNTER", "ORDER_TAKER");
    expect(canTakeCash(b)).toBe(false);
    expect(explainNoCash(b)).toContain("order taker");
  });

  it("still allows card on a curbside tablet", () => {
    const b = bootstrap(["PAYMENT_TAKE"], "CURBSIDE", "SALESPERSON");
    expect(canTakeCash(b)).toBe(false);
    expect(canTakeNonCash(b)).toBe(true);
    expect(canTakeAnyPayment(b)).toBe(true);
  });
});

describe("availablePaymentMethods", () => {
  it("offers everything the pack supports to a counter cashier", () => {
    const b = bootstrap(["PAYMENT_CASH", "PAYMENT_TAKE"], "COUNTER");
    expect(availablePaymentMethods(b)).toEqual(["CASH", "CARD", "WALLET"]);
  });

  it("drops cash on curbside so the tile is never rendered to be refused", () => {
    const b = bootstrap(["PAYMENT_CASH", "PAYMENT_TAKE"], "CURBSIDE");
    expect(availablePaymentMethods(b)).toEqual(["CARD", "WALLET"]);
  });

  it("offers cash only, when that is all the user has", () => {
    const b = bootstrap(["PAYMENT_CASH"], "COUNTER");
    expect(availablePaymentMethods(b)).toEqual(["CASH"]);
  });

  it("never offers a method the pack itself does not list", () => {
    const b = bootstrap(["PAYMENT_CASH", "PAYMENT_TAKE"], "COUNTER");
    b.pack.payment_methods = ["CASH"];
    expect(availablePaymentMethods(b)).toEqual(["CASH"]);
  });
});

describe("explainNoCash", () => {
  it("blames the device before the person — the device is the harder rule", () => {
    expect(explainNoCash(bootstrap([], "CURBSIDE", "CASHIER"))).toContain("no cash drawer");
  });

  it("handles a staff member with no position assigned", () => {
    expect(explainNoCash(bootstrap([], "COUNTER", null))).toContain("permission");
  });
});
