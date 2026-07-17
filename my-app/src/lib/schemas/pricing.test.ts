import { describe, expect, it } from "vitest";
import { pricingPatch, updatePricingSchema, type UpdatePricingForm } from "./pricing";

const values: UpdatePricingForm = {
  cost_price: "250.00",
  selling_price: "500.00",
  category: "Mains",
  is_available: true,
};

/**
 * The PATCH semantics — absent leaves, null clears — are invisible in the UI
 * and catastrophic when wrong: the failure mode is silently wiping a field on
 * every product an admin saves for an unrelated reason.
 */
describe("pricingPatch", () => {
  it("sends nothing when nothing was touched", () => {
    expect(pricingPatch(values, {})).toEqual({});
  });

  it("sends only the touched field", () => {
    expect(pricingPatch(values, { selling_price: true })).toEqual({ selling_price: "500.00" });
  });

  /**
   * The bug this exists to prevent. RHF hands you every registered field on
   * submit; posting `values` directly would send `category` on a save where the
   * admin only edited the price, and any product whose category was cleared in
   * the form's defaults would lose it.
   */
  it("does not send untouched fields even though they have values", () => {
    const patch = pricingPatch(values, { cost_price: true });
    expect(patch).toEqual({ cost_price: "250.00" });
    expect("category" in patch).toBe(false);
    expect("selling_price" in patch).toBe(false);
    expect("is_available" in patch).toBe(false);
  });

  it("turns an emptied field into an explicit null — that is a user clearing it", () => {
    expect(pricingPatch({ ...values, category: "" }, { category: true })).toEqual({
      category: null,
    });
    expect(pricingPatch({ ...values, selling_price: "" }, { selling_price: true })).toEqual({
      selling_price: null,
    });
  });

  it("distinguishes 'cleared' from 'untouched' — the whole point", () => {
    const cleared = pricingPatch({ ...values, category: "" }, { category: true });
    const untouched = pricingPatch({ ...values, category: "" }, {});
    expect(cleared).toEqual({ category: null });
    expect(untouched).toEqual({});
  });

  it("sends is_available: false rather than treating false as absent", () => {
    // A naive truthiness check drops this, making a product impossible to
    // un-list.
    expect(pricingPatch({ ...values, is_available: false }, { is_available: true })).toEqual({
      is_available: false,
    });
  });

  it("sends every dirty field together", () => {
    expect(
      pricingPatch(values, {
        cost_price: true,
        selling_price: true,
        category: true,
        is_available: true,
      }),
    ).toEqual({
      cost_price: "250.00",
      selling_price: "500.00",
      category: "Mains",
      is_available: true,
    });
  });
});

describe("updatePricingSchema", () => {
  it("accepts the money shapes a human types", () => {
    for (const v of ["250", "250.0", "250.00", "0", ""]) {
      expect(updatePricingSchema.safeParse({ ...values, cost_price: v }).success).toBe(true);
    }
  });

  it("rejects money it can't send", () => {
    for (const v of ["250.000", "-5", "abc", "1,200", "1e3"]) {
      expect(updatePricingSchema.safeParse({ ...values, cost_price: v }).success).toBe(false);
    }
  });

  it("allows an empty category (that's how you clear it)", () => {
    expect(updatePricingSchema.safeParse({ ...values, category: "" }).success).toBe(true);
  });

  it("rejects an over-long category", () => {
    expect(
      updatePricingSchema.safeParse({ ...values, category: "x".repeat(101) }).success,
    ).toBe(false);
  });
});

/**
 * A raw material has no sell price, and the UI removes the fields rather than
 * disabling them. This is the second line of defence: even if a sell field
 * somehow arrives dirty, it must not reach a product that can't be sold — the
 * server would 409 `product_not_sellable`, and a form that can trigger that is
 * a form with a bug.
 */
describe("pricingPatch — non-sellable products", () => {
  const dirtyEverything = {
    cost_price: true,
    selling_price: true,
    category: true,
    is_available: true,
  };

  it("still patches cost price — we buy raw materials", () => {
    expect(pricingPatch(values, { cost_price: true }, false)).toEqual({ cost_price: "250.00" });
  });

  it("drops every sell field for a raw material", () => {
    const patch = pricingPatch(values, dirtyEverything, false);
    expect(patch).toEqual({ cost_price: "250.00" });
    expect("selling_price" in patch).toBe(false);
    expect("category" in patch).toBe(false);
    expect("is_available" in patch).toBe(false);
  });

  it("sends everything for a sellable product", () => {
    expect(pricingPatch(values, dirtyEverything, true)).toEqual({
      cost_price: "250.00",
      selling_price: "500.00",
      category: "Mains",
      is_available: true,
    });
  });

  it("defaults to sellable, so existing callers are unchanged", () => {
    expect(pricingPatch(values, { selling_price: true })).toEqual({ selling_price: "500.00" });
  });
});
