/**
 * Synthetic order + payment objects for the offline sell path.
 *
 * Offline there is no server `order.id` yet — the order is a queued envelope
 * keyed by `local_id` (§9), and the server assigns the real id on sync. But the
 * till still has to *finish the sale now*: show a tender screen, take money,
 * print a receipt. So the seam hands the UI a `PosOrder` shaped exactly like a
 * server one, built from the cart and priced from the cached menu, with a
 * **sentinel id** that marks it "not yet synced".
 *
 * The totals here are honest about what a device can know offline: subtotal
 * only. Tax is the server's to compute and, under the PK pack, can depend on the
 * tender — so it is deliberately zero here and the server flags PRICE_DRIFT on
 * sync if the real total differs (§9). The device charges what it showed; the
 * back office reconciles the drift. Never present this subtotal as a tax-final
 * total on a customer receipt under a non-stub pack.
 */

import type { Minor } from "@/lib/money";
import { lineTotalMinor, type CartState } from "@/lib/pos/cart";
import type { PaymentInput, PaymentResult, PosOrder, PosOrderLine } from "@/lib/types/pos";

/**
 * The id an unsynced order carries. Zero is never a real server id, so
 * `order.id > 0` is the clean "this came from the server" test and needs no
 * extra flag on the wire type.
 */
export const LOCAL_ORDER_ID = 0;

/** True for an order minted on-device that the server hasn't assigned an id to yet. */
export function isLocalOrder(order: Pick<PosOrder, "id">): boolean {
  return order.id <= LOCAL_ORDER_ID;
}

/** A human-facing reference for an unsynced order — the tail of its local_id. */
export function localOrderNo(localId: string): string {
  return `OFFLINE-${localId.replace(/-/g, "").slice(-6).toUpperCase()}`;
}

/**
 * A `PosOrder` for the current cart, for the tender screen and receipt while
 * offline. Lines carry display names and prices from the cart (which took them
 * from the cached menu), so the receipt reads correctly without a round-trip.
 */
export function buildLocalOrder(cart: CartState, subtotalMinor: Minor, currency: string): PosOrder {
  const now = new Date().toISOString();

  const lines: PosOrderLine[] = cart.lines.map((l, i) => ({
    // Negative so a local line id can't collide with a server one if the two
    // ever meet in a map keyed by line id.
    id: -(i + 1),
    parent_line_id: null,
    menu_item_id: l.menu_item_id,
    name: l.name,
    quantity: l.quantity,
    unit_price_minor: l.unit_price_minor + l.modifier_delta_minor,
    line_total_minor: lineTotalMinor(l),
    modifier_option_ids: l.modifier_option_ids,
    modifiers: l.modifier_labels.map((name, j) => ({
      id: -(j + 1),
      name,
      // The per-option delta split isn't tracked on the label; it's already
      // folded into the line's unit price above. Zero here is display-only.
      price_delta_minor: 0,
    })),
    note: l.note ?? null,
  }));

  return {
    id: LOCAL_ORDER_ID,
    local_id: cart.local_id,
    order_no: localOrderNo(cart.local_id),
    // The device fired (or will fire) the kitchen ticket, so from the till's
    // point of view this is a sent order — the sync envelope carries was_sent.
    status: "SENT",
    channel: cart.channel,
    order_type: cart.order_type,
    branch_id: 0,
    customer_id: cart.customer_id,
    lines,
    subtotal_minor: subtotalMinor,
    discount_minor: 0,
    tax_minor: 0,
    total_minor: subtotalMinor,
    paid_minor: 0,
    due_minor: subtotalMinor,
    currency,
    menu_version_id: 0,
    vehicle_plate: cart.vehicle_plate || null,
    vehicle_colour: cart.vehicle_colour || null,
    bay_no: cart.bay_no || null,
    created_at: now,
    sent_at: now,
  };
}

/**
 * The `PaymentResult` a queued offline tender resolves to. The server issues the
 * authoritative one on sync (same `client_payment_id`, so no double charge);
 * this is what the change screen and receipt render against in the meantime.
 */
export function buildLocalPayment(orderId: number, input: PaymentInput): PaymentResult {
  const tendered = input.tendered_minor ?? null;
  const change =
    input.method === "CASH"
      ? tendered != null && tendered >= input.amount_minor
        ? tendered - input.amount_minor
        : 0
      : null;

  return {
    id: LOCAL_ORDER_ID,
    order_id: orderId,
    method: input.method,
    amount_minor: input.amount_minor,
    tendered_minor: tendered,
    change_minor: change,
    status: "CAPTURED",
    created_at: new Date().toISOString(),
  };
}
