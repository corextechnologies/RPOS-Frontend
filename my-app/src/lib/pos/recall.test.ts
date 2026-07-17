import { describe, expect, it } from "vitest";
import { cartFromOrder } from "./cart";
import type { MenuItem, PosOrder } from "@/lib/types/pos";

/**
 * Recall — rebuilding a cart from a parked order.
 *
 * The failure mode this guards is quiet and expensive: getting `local_id` or
 * `order_id` wrong turns one parked order into two sales, and nobody notices
 * until the stock count.
 */

const MENU: MenuItem[] = [
  {
    id: 10,
    name: "Burger",
    category: "Mains",
    price_minor: 50000,
    is_combo: false,
    is_available: true,
    unavailable_reason: null,
    components: [],
    modifier_groups: [
      {
        id: 1,
        name: "Extras",
        min_select: 0,
        max_select: 2,
        options: [
          { id: 5, name: "Extra cheese", price_delta_minor: 5000 },
          { id: 6, name: "Bacon", price_delta_minor: 7500 },
        ],
      },
    ],
  },
  {
    id: 20,
    name: "Meal Deal",
    category: "Combos",
    price_minor: 90000,
    is_combo: true,
    is_available: true,
    unavailable_reason: null,
    components: [{ item_id: 10, quantity: 1 }],
    modifier_groups: [],
  },
];

function order(over: Partial<PosOrder> = {}): PosOrder {
  return {
    id: 77,
    local_id: "local-abc",
    order_no: "BR0001-T1-A1B2C3D4",
    status: "PARKED",
    channel: "COUNTER",
    order_type: "TAKEAWAY",
    branch_id: 1,
    customer_id: null,
    lines: [],
    subtotal_minor: 0,
    discount_minor: 0,
    tax_minor: 0,
    total_minor: 0,
    paid_minor: 0,
    due_minor: 0,
    currency: "PKR",
    menu_version_id: 3,
    created_at: "2026-07-17T10:00:00Z",
    ...over,
  };
}

const LINE = {
  id: 1,
  parent_line_id: null,
  menu_item_id: 10,
  name: "Burger",
  quantity: 2,
  unit_price_minor: 50000,
  line_total_minor: 100000,
  modifier_option_ids: [] as number[],
};

describe("cartFromOrder", () => {
  /**
   * The one that matters. A recalled order is the SAME order — a fresh
   * local_id would make the server treat it as a second sale, which is exactly
   * what local_id exists to prevent.
   */
  it("keeps the order's local_id rather than minting a new one", () => {
    expect(cartFromOrder(order(), MENU).local_id).toBe("local-abc");
  });

  it("remembers the server order id so sending updates rather than re-creates", () => {
    expect(cartFromOrder(order(), MENU).order_id).toBe(77);
  });

  it("carries the order's own context back", () => {
    const cart = cartFromOrder(
      order({
        channel: "CURBSIDE",
        order_type: "CURBSIDE",
        customer_id: 9,
        vehicle_plate: "ABC-123",
        vehicle_colour: "red",
        bay_no: "4",
      }),
      MENU,
    );
    expect(cart.channel).toBe("CURBSIDE");
    expect(cart.order_type).toBe("CURBSIDE");
    expect(cart.customer_id).toBe(9);
    expect(cart.vehicle_plate).toBe("ABC-123");
    expect(cart.vehicle_colour).toBe("red");
    expect(cart.bay_no).toBe("4");
  });

  it("nulls become empty strings, because those fields are inputs", () => {
    const cart = cartFromOrder(order(), MENU);
    expect(cart.vehicle_plate).toBe("");
    expect(cart.bay_no).toBe("");
  });

  it("rebuilds lines with quantity intact", () => {
    const cart = cartFromOrder(order({ lines: [LINE] }), MENU);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].menu_item_id).toBe(10);
    expect(cart.lines[0].quantity).toBe(2);
  });

  it("re-resolves modifier labels and deltas from the menu", () => {
    const cart = cartFromOrder(
      order({ lines: [{ ...LINE, modifier_option_ids: [5, 6] }] }),
      MENU,
    );
    expect(cart.lines[0].modifier_labels).toEqual(["Extra cheese", "Bacon"]);
    expect(cart.lines[0].modifier_delta_minor).toBe(12500);
  });

  /**
   * Combo children are the server's expansion of the parent. Re-sending them as
   * top-level lines would order the components a second time.
   */
  it("drops combo child lines", () => {
    const cart = cartFromOrder(
      order({
        lines: [
          { ...LINE, id: 1, menu_item_id: 20, name: "Meal Deal", parent_line_id: null },
          { ...LINE, id: 2, menu_item_id: 10, name: "Burger", parent_line_id: 1 },
        ],
      }),
      MENU,
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].menu_item_id).toBe(20);
    expect(cart.lines[0].is_combo).toBe(true);
  });

  it("gives every rebuilt line a distinct uid", () => {
    const cart = cartFromOrder(
      order({ lines: [LINE, { ...LINE, id: 2, modifier_option_ids: [5] }] }),
      MENU,
    );
    expect(cart.lines[0].uid).not.toBe(cart.lines[1].uid);
  });

  it("survives an item that has left the menu", () => {
    const cart = cartFromOrder(order({ lines: [{ ...LINE, menu_item_id: 999 }] }), MENU);
    // The name and price fall back to what the order recorded rather than
    // throwing — the sale happened, and the cashier needs to see it.
    expect(cart.lines[0].name).toBe("Burger");
    expect(cart.lines[0].unit_price_minor).toBe(50000);
    expect(cart.lines[0].modifier_delta_minor).toBe(0);
  });

  /**
   * The menu is the price authority for a cart. A recalled order's stored price
   * may be stale; either way the server re-prices on send, so a difference
   * surfaces as a 409 rather than as a wrong charge.
   */
  it("prices from the menu, not the order's stored line price", () => {
    const cart = cartFromOrder(
      order({ lines: [{ ...LINE, unit_price_minor: 1 }] }),
      MENU,
    );
    expect(cart.lines[0].unit_price_minor).toBe(50000);
  });

  it("keeps a line note", () => {
    const cart = cartFromOrder(order({ lines: [{ ...LINE, note: "no ice" }] }), MENU);
    expect(cart.lines[0].note).toBe("no ice");
  });
});
