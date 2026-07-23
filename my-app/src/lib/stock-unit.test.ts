import { describe, expect, it } from "vitest";
import { formatQtyNumber, formatStockQty } from "./stock-unit";

describe("formatQtyNumber", () => {
  it("leaves whole numbers untouched", () => {
    expect(formatQtyNumber(95)).toBe("95");
    expect(formatQtyNumber(0)).toBe("0");
  });

  it("keeps meaningful decimals and drops trailing zeros", () => {
    expect(formatQtyNumber(0.7)).toBe("0.7");
    expect(formatQtyNumber(0.25)).toBe("0.25");
    expect(formatQtyNumber(0.7)).toBe("0.7");
  });

  it("collapses binary-float drift", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE-754.
    expect(formatQtyNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatQtyNumber(700 / 1000)).toBe("0.7");
  });
});

describe("formatStockQty", () => {
  it("appends the unit label", () => {
    expect(formatStockQty(95, "KG")).toBe("95 kg");
    expect(formatStockQty(0.7, "KG")).toBe("0.7 kg");
    expect(formatStockQty(250, "GRAM")).toBe("250 g");
  });

  it("blanks EACH, matching how it reads next to a quantity", () => {
    expect(formatStockQty(19, "EACH")).toBe("19");
    expect(formatStockQty(19, null)).toBe("19");
  });
});
