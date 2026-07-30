import { describe, expect, it } from "vitest";
import {
  buildLocalOrder,
  buildLocalPayment,
  isLocalOrder,
  LOCAL_ORDER_ID,
  localOrderNo,
} from "./local-order";
import type { CartLine, CartState } from "@/lib/pos/cart";
import type { PaymentInput } from "@/lib/types/pos";

function line(over: Partial<CartLine> = {}): CartLine {
  return {
    uid: "u1",
    menu_item_id: 10,
    name: "Burger",
    unit_price_minor: 45000,
    quantity: 1,
    modifier_option_ids: [],
    modifier_labels: [],
    modifier_delta_minor: 0,
    is_combo: false,
    ...over,
  };
}

function cart(over: Partial<CartState> = {}): CartState {
  return {
    local_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff",
    lines: [line()],
    channel: "COUNTER",
    order_type: "TAKEAWAY",
    customer_id: null,
    vehicle_plate: "",
    vehicle_colour: "",
    bay_no: "",
    order_id: null,
    ...over,
  };
}

describe("isLocalOrder", () => {
  it("is true for the sentinel id and false for a real one", () => {
    expect(isLocalOrder({ id: LOCAL_ORDER_ID })).toBe(true);
    expect(isLocalOrder({ id: 0 })).toBe(true);
    expect(isLocalOrder({ id: 123 })).toBe(false);
  });
});

describe("localOrderNo", () => {
  it("is derived from the local_id tail and stable", () => {
    const no = localOrderNo("aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff");
    expect(no).toBe("OFFLINE-FFFFFF");
    expect(localOrderNo("aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff")).toBe(no);
  });
});

describe("buildLocalOrder", () => {
  it("carries the local_id and the sentinel server id", () => {
    const o = buildLocalOrder(cart(), 45000, "PKR");
    expect(o.id).toBe(LOCAL_ORDER_ID);
    expect(o.local_id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff");
    expect(o.status).toBe("SENT");
    expect(o.currency).toBe("PKR");
  });

  it("prices to subtotal with zero tax — the device can't know tax offline", () => {
    const o = buildLocalOrder(cart(), 45000, "PKR");
    expect(o.subtotal_minor).toBe(45000);
    expect(o.tax_minor).toBe(0);
    expect(o.discount_minor).toBe(0);
    expect(o.total_minor).toBe(45000);
    expect(o.due_minor).toBe(45000);
    expect(o.paid_minor).toBe(0);
  });

  it("folds modifier deltas into the line's unit price", () => {
    const o = buildLocalOrder(
      cart({
        lines: [
          line({
            quantity: 2,
            modifier_delta_minor: 5000,
            modifier_labels: ["Extra cheese"],
            modifier_option_ids: [7],
          }),
        ],
      }),
      100000,
      "PKR",
    );
    const [l] = o.lines;
    expect(l.unit_price_minor).toBe(50000); // 45000 + 5000
    expect(l.line_total_minor).toBe(100000); // (45000 + 5000) * 2
    expect(l.modifiers?.map((m) => m.name)).toEqual(["Extra cheese"]);
    expect(l.modifier_option_ids).toEqual([7]);
  });

  it("passes curbside vehicle details through, empty strings becoming null", () => {
    const withCar = buildLocalOrder(
      cart({ vehicle_plate: "ABC-123", vehicle_colour: "red", bay_no: "3" }),
      45000,
      "PKR",
    );
    expect(withCar.vehicle_plate).toBe("ABC-123");

    const noCar = buildLocalOrder(cart(), 45000, "PKR");
    expect(noCar.vehicle_plate).toBeNull();
    expect(noCar.bay_no).toBeNull();
  });
});

describe("buildLocalPayment", () => {
  const base: PaymentInput = { method: "CASH", amount_minor: 45000 };

  it("computes cash change from what was tendered", () => {
    const p = buildLocalPayment(0, { ...base, tendered_minor: 50000 });
    expect(p.status).toBe("CAPTURED");
    expect(p.change_minor).toBe(5000);
    expect(p.method).toBe("CASH");
  });

  it("has no change for a non-cash tender", () => {
    const p = buildLocalPayment(0, { method: "ONLINE", amount_minor: 45000 });
    expect(p.change_minor).toBeNull();
  });

  it("never returns negative change", () => {
    const p = buildLocalPayment(0, { ...base, tendered_minor: 40000 });
    expect(p.change_minor).toBe(0);
  });
});
