import { describe, expect, it } from "vitest";
import { renderKotText, renderKotTicket, renderReceiptText, renderReceipt } from "./render";
import type { ReceiptData } from "./render";
import type { StationTicket } from "./routing";

const ticket: StationTicket = {
  station: { id: 1, code: "GRILL", name: "Grill", sort_order: 1, is_expo: false },
  lines: [
    { menu_item_id: 1, category: "Grill", name: "Burger", quantity: 2, modifiers: ["Extra cheese"], note: "no onion" },
    { menu_item_id: 2, category: "Grill", name: "Steak", quantity: 1 },
  ],
};

describe("kitchen ticket", () => {
  it("shows station, quantities, modifiers and notes", () => {
    const text = renderKotText({ order_no: "A-101", order_type: "TAKEAWAY" }, ticket);
    expect(text).toContain("GRILL");
    expect(text).toContain("A-101");
    expect(text).toContain("2 x Burger");
    expect(text).toContain("+ Extra cheese");
    expect(text).toContain("** NO ONION");
    expect(text).toContain("1 x Steak");
  });

  it("carries NO prices — the kitchen makes food, not money", () => {
    const text = renderKotText({ order_no: "A-101" }, ticket);
    // No currency, no decimal amount anywhere on a kitchen ticket.
    expect(text).not.toMatch(/PKR|Rs|\d+\.\d{2}/);
  });

  it("shows curbside vehicle details when present", () => {
    const text = renderKotText(
      { order_no: "A-101", vehicle_plate: "ABC-123", vehicle_colour: "red", bay_no: "3" },
      ticket,
    );
    expect(text).toContain("CAR: ABC-123 red");
    expect(text).toContain("BAY 3");
  });

  it("emits ESC/POS bytes that start with the reset command and end cut", () => {
    const bytes = renderKotTicket({ order_no: "A-101" }, ticket);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    // ESC @ (init) at the start.
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    // GS V (cut) appears near the end.
    let hasCut = false;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0x1d && bytes[i + 1] === 0x56) hasCut = true;
    }
    expect(hasCut).toBe(true);
  });
});

describe("customer receipt", () => {
  const data: ReceiptData = {
    branch_name: "Gulberg",
    order_no: "A-101",
    lines: [
      { name: "Burger", quantity: 2, line_total_minor: 90000, modifiers: ["Extra cheese"] },
      { name: "Fries", quantity: 1, line_total_minor: 20000 },
    ],
    subtotal_minor: 110000,
    discount_minor: 0,
    tax_minor: 0,
    total_minor: 110000,
    payment: { method: "CASH", amount_minor: 110000, tendered_minor: 120000, change_minor: 10000 },
    currency: "PKR",
    minorUnits: 2,
    footer: "Not a tax invoice",
  };

  it("prices lines and totals in the branch currency", () => {
    const text = renderReceiptText(data);
    expect(text).toContain("Gulberg");
    expect(text).toContain("2 x Burger");
    expect(text).toContain("Subtotal");
    expect(text).toContain("TOTAL");
    // 110000 minor = 1,100.00 PKR — the money formatter renders the currency.
    expect(text).toMatch(/1,100\.00/);
  });

  it("shows tender and change for a cash payment", () => {
    const text = renderReceiptText(data);
    expect(text).toContain("CASH");
    expect(text).toContain("Tendered");
    expect(text).toContain("Change");
    expect(text).toMatch(/100\.00/); // change 10000 minor
  });

  it("omits change for a non-cash tender", () => {
    const text = renderReceiptText({
      ...data,
      payment: { method: "ONLINE", amount_minor: 110000, change_minor: null },
    });
    expect(text).not.toContain("Change");
  });

  it("shows a discount row only when there is one", () => {
    expect(renderReceiptText(data)).not.toContain("Discount");
    const withDiscount = renderReceiptText({ ...data, discount_minor: 5000 });
    expect(withDiscount).toContain("Discount");
  });

  it("emits ESC/POS bytes", () => {
    const bytes = renderReceipt(data);
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    expect(bytes.length).toBeGreaterThan(0);
  });
});
