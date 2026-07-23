import { describe, expect, it } from "vitest";
import { canConvertUnit, convertQty, tryConvertQty } from "./unit-convert";

describe("unit conversion", () => {
  it("converts within MASS", () => {
    expect(convertQty(1, "KG", "GRAM")).toBe(1000);
    expect(convertQty(1000, "GRAM", "KG")).toBe(1);
    // The bun example: 10 buns × 100 g = 1000 g = 1 kg drawn from kg stock.
    expect(convertQty(1000, "GRAM", "KG")).toBe(1);
  });

  it("converts within VOLUME", () => {
    expect(convertQty(2, "LITER", "ML")).toBe(2000);
    expect(convertQty(250, "ML", "LITER")).toBe(0.25);
  });

  it("returns fractional results without rounding", () => {
    // 7 buns × 100 g = 700 g = 0.7 kg.
    expect(convertQty(700, "GRAM", "KG")).toBeCloseTo(0.7);
  });

  it("is a no-op for identical units", () => {
    expect(convertQty(5, "EACH", "EACH")).toBe(5);
    expect(convertQty(5, "SLICE", "SLICE")).toBe(5);
  });

  it("knows what can convert", () => {
    expect(canConvertUnit("KG", "GRAM")).toBe(true);
    expect(canConvertUnit("LITER", "ML")).toBe(true);
    expect(canConvertUnit("EACH", "EACH")).toBe(true);
    // Cross-dimension is never allowed.
    expect(canConvertUnit("KG", "LITER")).toBe(false);
    expect(canConvertUnit("GRAM", "EACH")).toBe(false);
    // Non-convertible dimensions only convert to themselves.
    expect(canConvertUnit("SLICE", "PORTION")).toBe(false);
    expect(canConvertUnit("CUP", "TABLESPOON")).toBe(false);
  });

  it("throws on an illegal conversion", () => {
    expect(() => convertQty(100, "GRAM", "EACH")).toThrow(/incompatible/);
    expect(() => convertQty(1, "KG", "LITER")).toThrow(/incompatible/);
  });

  it("tryConvertQty returns null instead of throwing", () => {
    expect(tryConvertQty(100, "GRAM", "EACH")).toBeNull();
    expect(tryConvertQty(1, "KG", "GRAM")).toBe(1000);
  });
});
