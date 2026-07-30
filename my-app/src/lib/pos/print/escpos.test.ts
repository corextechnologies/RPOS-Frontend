import { describe, expect, it } from "vitest";
import { EscPosBuilder, twoColumns } from "./escpos";

describe("EscPosBuilder", () => {
  it("init emits ESC @", () => {
    const bytes = new EscPosBuilder().init().build();
    expect([...bytes]).toEqual([0x1b, 0x40]);
  });

  it("encodes text as UTF-8 with a line feed", () => {
    const bytes = new EscPosBuilder().line("OK").build();
    expect([...bytes]).toEqual([0x4f, 0x4b, 0x0a]);
  });

  it("align emits ESC a n", () => {
    expect([...new EscPosBuilder().align("center").build()]).toEqual([0x1b, 0x61, 1]);
    expect([...new EscPosBuilder().align("right").build()]).toEqual([0x1b, 0x61, 2]);
  });

  it("size packs width/height into the GS ! nibbles", () => {
    // 2x2 → high nibble width-1 (1), low nibble height-1 (1) → 0x11
    expect([...new EscPosBuilder().size(2, 2).build()]).toEqual([0x1d, 0x21, 0x11]);
    expect([...new EscPosBuilder().normal().build()]).toEqual([0x1d, 0x21, 0x00]);
  });

  it("clamps size multipliers to 1..8", () => {
    expect([...new EscPosBuilder().size(0, 99).build()]).toEqual([0x1d, 0x21, 0x07]);
  });

  it("cut feeds then emits GS V 0", () => {
    const bytes = [...new EscPosBuilder().cut().build()];
    expect(bytes.slice(0, 3)).toEqual([0x0a, 0x0a, 0x0a]); // feeds first
    expect(bytes.slice(-3)).toEqual([0x1d, 0x56, 0x00]); // ... then GS V 0
  });
});

describe("twoColumns", () => {
  it("pads the label so the value is right-aligned to the width", () => {
    const row = twoColumns("Total", "500.00", 20);
    expect(row).toHaveLength(20);
    expect(row.endsWith("500.00")).toBe(true);
    expect(row.startsWith("Total")).toBe(true);
  });

  it("truncates an overlong label rather than push the value off the paper", () => {
    const row = twoColumns("A very long item name indeed", "9.99", 16);
    expect(row).toHaveLength(16);
    expect(row.endsWith("9.99")).toBe(true);
  });
});
