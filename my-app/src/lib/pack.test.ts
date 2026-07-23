import { describe, expect, it } from "vitest";
import {
  normalizeUnitsPerPack,
  packConversionHint,
  packCountLabel,
  packsFromQty,
  qtyConversionHint,
  qtyFromPacks,
} from "./pack";

describe("pack helpers", () => {
  it("normalizes pack size", () => {
    expect(normalizeUnitsPerPack(5)).toBe(5);
    expect(normalizeUnitsPerPack("5")).toBe(5);
    expect(normalizeUnitsPerPack("")).toBe(null);
    expect(normalizeUnitsPerPack(0)).toBe(null);
    expect(normalizeUnitsPerPack(1.5)).toBe(null);
  });

  it("converts qty ↔ packs", () => {
    expect(packsFromQty(95, 5)).toBe(19);
    expect(qtyFromPacks(19, 5)).toBe(95);
    expect(packsFromQty(95, null)).toBe(null);
  });

  it("formats labels and hints", () => {
    expect(packCountLabel(95, 5)).toBe("19 packs");
    expect(packConversionHint(5, 5, "KG")).toBe("5 packs = 25 kg");
    expect(qtyConversionHint(25, 5, "KG")).toBe("25 kg = 5 packs");
  });
});
