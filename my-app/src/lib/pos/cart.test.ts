import { describe, expect, it } from "vitest";
import { cartSubtotalMinor, lineTotalMinor, validateModifiers, type CartLine } from "./cart";
import type { MenuModifierGroup } from "@/lib/types/pos";

function line(over: Partial<CartLine> = {}): CartLine {
  return {
    uid: "u1",
    menu_item_id: 10,
    name: "Burger",
    unit_price_minor: 50000,
    quantity: 1,
    modifier_option_ids: [],
    modifier_labels: [],
    modifier_delta_minor: 0,
    is_combo: false,
    ...over,
  };
}

describe("cart totals", () => {
  it("prices a plain line", () => {
    expect(lineTotalMinor(line())).toBe(50000);
  });

  it("adds modifier deltas before multiplying by quantity", () => {
    // 2 x (500.00 + 50.00) = 1100.00 — not 500.00*2 + 50.00
    expect(lineTotalMinor(line({ quantity: 2, modifier_delta_minor: 5000 }))).toBe(110000);
  });

  it("handles a negative delta", () => {
    expect(lineTotalMinor(line({ modifier_delta_minor: -5000 }))).toBe(45000);
  });

  it("sums a cart", () => {
    expect(
      cartSubtotalMinor([
        line({ uid: "a", quantity: 2 }),
        line({ uid: "b", unit_price_minor: 12550, quantity: 3 }),
      ]),
    ).toBe(100000 + 37650);
  });

  it("is exact where floats would not be", () => {
    // 3 x 0.10 is 0.30000000000000004 in float. Integers don't have opinions.
    expect(cartSubtotalMinor([line({ unit_price_minor: 10, quantity: 3 })])).toBe(30);
  });

  it("an empty cart is zero, not NaN", () => {
    expect(cartSubtotalMinor([])).toBe(0);
  });
});

describe("validateModifiers", () => {
  const required: MenuModifierGroup = {
    id: 1,
    name: "Sauce",
    min_select: 1,
    max_select: 1,
    options: [
      { id: 11, name: "Ketchup", price_delta_minor: 0 },
      { id: 12, name: "Mayo", price_delta_minor: 0 },
    ],
  };

  const optional: MenuModifierGroup = {
    id: 2,
    name: "Extras",
    min_select: 0,
    max_select: 2,
    options: [
      { id: 21, name: "Cheese", price_delta_minor: 5000 },
      { id: 22, name: "Bacon", price_delta_minor: 7500 },
      { id: 23, name: "Egg", price_delta_minor: 5000 },
    ],
  };

  it("passes when a required group is satisfied", () => {
    expect(validateModifiers([required], [11]).ok).toBe(true);
  });

  it("fails a required group with nothing chosen", () => {
    const v = validateModifiers([required], []);
    expect(v.ok).toBe(false);
    expect(v.errors[1]).toBe("Choose an option");
  });

  it("passes an optional group left empty", () => {
    expect(validateModifiers([optional], []).ok).toBe(true);
  });

  it("fails when max_select is exceeded", () => {
    const v = validateModifiers([optional], [21, 22, 23]);
    expect(v.ok).toBe(false);
    expect(v.errors[2]).toBe("Choose at most 2");
  });

  it("allows exactly max_select", () => {
    expect(validateModifiers([optional], [21, 22]).ok).toBe(true);
  });

  it("reports every failing group at once, not just the first", () => {
    const two: MenuModifierGroup = { ...required, id: 3, name: "Bun" };
    const v = validateModifiers([required, two], []);
    expect(Object.keys(v.errors)).toEqual(["1", "3"]);
  });

  it("counts only options belonging to the group being checked", () => {
    // Selecting two Extras must not satisfy the Sauce group's minimum.
    const v = validateModifiers([required, optional], [21, 22]);
    expect(v.ok).toBe(false);
    expect(v.errors[1]).toBeDefined();
    expect(v.errors[2]).toBeUndefined();
  });

  it("treats max_select of 0 as unlimited rather than 'choose none'", () => {
    const unlimited: MenuModifierGroup = { ...optional, max_select: 0 };
    expect(validateModifiers([unlimited], [21, 22, 23]).ok).toBe(true);
  });

  it("asks for the shortfall when several are still needed", () => {
    const pickThree: MenuModifierGroup = { ...optional, min_select: 3, max_select: 3 };
    expect(validateModifiers([pickThree], [21]).errors[2]).toBe("Choose 2 more");
  });
});
