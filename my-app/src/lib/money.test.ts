import { describe, expect, it } from "vitest";
import {
  applyBasisPoints,
  formatBasisPoints,
  formatMinor,
  minorToDecimalString,
  MoneyError,
  multiplyMinor,
  parseDecimalToMinor,
  sumMinor,
} from "./money";

/**
 * The off-by-100 net.
 *
 * The predicted bug in this codebase is a total that mixes minor units with the
 * legacy decimal strings, or a float that rounds the wrong way on a value you
 * can't reproduce. These tests are cheap and they are the only thing standing
 * between that bug and a customer's receipt.
 */

describe("parseDecimalToMinor", () => {
  it("parses the shapes the backend actually sends", () => {
    expect(parseDecimalToMinor("500.00")).toBe(50000);
    expect(parseDecimalToMinor("500")).toBe(50000);
    expect(parseDecimalToMinor("0.05")).toBe(5);
    expect(parseDecimalToMinor("0")).toBe(0);
    expect(parseDecimalToMinor(".5")).toBe(50);
  });

  it("handles signs", () => {
    expect(parseDecimalToMinor("-12.50")).toBe(-1250);
    expect(parseDecimalToMinor("+12.50")).toBe(1250);
  });

  it("respects a currency's minor units rather than assuming 2", () => {
    expect(parseDecimalToMinor("500", 0)).toBe(500); // JPY-style
    expect(parseDecimalToMinor("1.234", 3)).toBe(1234); // KWD-style
  });

  it("rounds half-up on excess precision instead of truncating", () => {
    expect(parseDecimalToMinor("1.005")).toBe(101);
    expect(parseDecimalToMinor("1.004")).toBe(100);
    expect(parseDecimalToMinor("-1.005")).toBe(-101);
  });

  /**
   * The reason this function is string-based. `parseFloat("1.005") * 100` is
   * 100.49999999999999 — `Math.round` of that is 100, silently losing a paisa
   * on an input a human would call unambiguous.
   */
  it("beats the float implementation it replaces", () => {
    expect(Math.round(parseFloat("1.005") * 100)).toBe(100);
    expect(parseDecimalToMinor("1.005")).toBe(101);
  });

  it("rejects junk rather than coercing it to zero", () => {
    expect(() => parseDecimalToMinor("")).toThrow(MoneyError);
    expect(() => parseDecimalToMinor(null)).toThrow(MoneyError);
    expect(() => parseDecimalToMinor("abc")).toThrow(MoneyError);
    expect(() => parseDecimalToMinor("1.2.3")).toThrow(MoneyError);
    expect(() => parseDecimalToMinor("1,200.00")).toThrow(MoneyError);
  });
});

describe("minorToDecimalString", () => {
  it("round-trips with parseDecimalToMinor", () => {
    for (const v of ["0.00", "0.05", "500.00", "1234567.89", "-12.50"]) {
      expect(minorToDecimalString(parseDecimalToMinor(v))).toBe(v);
    }
  });

  it("pads sub-unit amounts", () => {
    expect(minorToDecimalString(5)).toBe("0.05");
    expect(minorToDecimalString(0)).toBe("0.00");
    expect(minorToDecimalString(-5)).toBe("-0.05");
  });

  it("is exact past float's safe range for currency", () => {
    expect(minorToDecimalString(900719925474099)).toBe("9007199254740.99");
  });

  it("honours 0 minor units", () => {
    expect(minorToDecimalString(500, 0)).toBe("500");
  });
});

describe("formatMinor", () => {
  it("formats the guide's own example", () => {
    // Non-breaking spaces vary by ICU build; assert on content, not spacing.
    const out = formatMinor(50000, "PKR", 2, "en-PK");
    expect(out).toContain("500.00");
    expect(out.replace(/\s/g, "")).toContain("PKR500.00");
  });

  /**
   * Pins the reason `currencyDisplay: "code"` is set. ICU's default for PKR in
   * en-PK is the ambiguous "Rs" (shared with INR/LKR/NPR). If a future ICU
   * build changes this, that's a receipt-correctness change and should fail
   * loudly here rather than ship.
   */
  it("does not use the ambiguous Rs symbol", () => {
    const out = formatMinor(50000, "PKR", 2, "en-PK");
    expect(out).not.toContain("Rs");
    expect(
      new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(500),
    ).toContain("Rs");
  });

  it("formats the AE pack's currency too", () => {
    expect(formatMinor(52500, "AED", 2, "en-AE").replace(/\s/g, "")).toContain("AED525.00");
  });

  it("does not fall over on an unknown currency", () => {
    expect(formatMinor(50000, "XXY")).toContain("500.00");
  });

  it("refuses a fractional minor amount — that means a float leaked in", () => {
    expect(() => formatMinor(500.5)).toThrow(MoneyError);
  });
});

describe("integer arithmetic", () => {
  it("sums", () => {
    expect(sumMinor([50000, 2500, 5])).toBe(52505);
    expect(sumMinor([])).toBe(0);
  });

  it("multiplies by whole quantities only", () => {
    expect(multiplyMinor(50000, 3)).toBe(150000);
    expect(() => multiplyMinor(50000, 1.5)).toThrow(MoneyError);
  });

  /** 0.1 + 0.2 !== 0.3, which is why none of this is done in floats. */
  it("has no float error", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumMinor([10, 20])).toBe(30);
  });

  it("rejects fractional inputs rather than silently truncating", () => {
    expect(() => sumMinor([1.5])).toThrow(MoneyError);
  });
});

describe("basis points", () => {
  it("applies a percentage", () => {
    expect(applyBasisPoints(50000, 5000)).toBe(25000); // 50%
    expect(applyBasisPoints(50000, 250)).toBe(1250); // 2.5%
    expect(applyBasisPoints(50000, 0)).toBe(0);
  });

  it("rounds half-up and stays integral", () => {
    expect(applyBasisPoints(1, 5000)).toBe(1); // 0.5 -> 1
    expect(applyBasisPoints(101, 5000)).toBe(51); // 50.5 -> 51
  });

  it("formats without trailing-zero noise", () => {
    expect(formatBasisPoints(5000)).toBe("50%");
    expect(formatBasisPoints(250)).toBe("2.5%");
    expect(formatBasisPoints(10000)).toBe("100%");
  });
});
