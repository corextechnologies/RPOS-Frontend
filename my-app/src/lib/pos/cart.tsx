"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { multiplyMinor, sumMinor, type Minor } from "@/lib/money";
import { newLocalId } from "./idempotency";
import type {
  MenuItem,
  MenuModifierGroup,
  OrderChannel,
  OrderType,
  PosOrder,
  PosOrderCreate,
} from "@/lib/types/pos";

/**
 * The cart.
 *
 * Two rules this file exists to enforce:
 *
 * 1. **`local_id` is minted once, when the cart is created, and never
 *    regenerated.** It is the order's identity forever, so a retry of the same
 *    cart is recognised as the same order whatever `Idempotency-Key` it arrives
 *    with. Regenerating it on, say, a re-render would turn one order into two
 *    sales.
 * 2. **Totals here are a PROPOSAL, never an authority.** The server prices. We
 *    compute a subtotal so the customer can see a number while ordering, and we
 *    send it as `expected_total_minor` so a disagreement surfaces as a 409
 *    instead of a silent overcharge. Tax is deliberately absent — only the
 *    server's pack knows it, and under PK rules it can depend on the tender.
 */

const CART_KEY = "rpos-pos-cart";

export interface CartLine {
  /** Client-side only; distinguishes two lines of the same item + options. */
  uid: string;
  menu_item_id: number;
  name: string;
  unit_price_minor: Minor;
  quantity: number;
  modifier_option_ids: number[];
  modifier_labels: string[];
  modifier_delta_minor: Minor;
  note?: string;
  /**
   * Flags the line for final prep at the branch sub-kitchen. Sending the order
   * drops a prep job on the chef's board carrying `note` as the instruction.
   */
  needs_prep: boolean;
  is_combo: boolean;
  /** Send this line to the branch sub-kitchen for finishing. Defaulted from the
   *  menu item's made_to_order when the line is added; toggleable per line. */
  needs_prep?: boolean;
}

export interface CartState {
  local_id: string;
  lines: CartLine[];
  channel: OrderChannel;
  order_type: OrderType;
  customer_id: number | null;
  vehicle_plate: string;
  vehicle_colour: string;
  bay_no: string;
  /** Set once the DRAFT/PARKED order exists server-side. */
  order_id: number | null;
}

function emptyCart(): CartState {
  return {
    local_id: newLocalId(),
    lines: [],
    channel: "COUNTER",
    order_type: "TAKEAWAY",
    customer_id: null,
    vehicle_plate: "",
    vehicle_colour: "",
    bay_no: "",
    order_id: null,
  };
}

type Action =
  | { type: "add"; line: Omit<CartLine, "uid"> }
  | { type: "setQty"; uid: string; quantity: number }
  | { type: "remove"; uid: string }
  | { type: "setNote"; uid: string; note: string }
  | { type: "setNeedsPrep"; uid: string; needs_prep: boolean }
  | { type: "patch"; patch: Partial<CartState> }
  | { type: "reset" }
  | { type: "hydrate"; state: CartState };

/**
 * Rebuild a cart from a server order — the recall half of park/recall.
 *
 * The order's `local_id` and `id` come back with it, deliberately: a recalled
 * order is the SAME order, so parking, recalling and sending must not mint a
 * second one. That is the whole reason `local_id` is on the wire.
 *
 * Combo children (`parent_line_id != null`) are dropped: they are the server's
 * expansion of the parent, and re-sending them as top-level lines would order
 * the components twice.
 */
export function cartFromOrder(order: PosOrder, menu: readonly MenuItem[]): CartState {
  const byId = new Map(menu.map((m) => [m.id, m]));

  const lines: CartLine[] = order.lines
    .filter((l) => l.parent_line_id === null)
    .map((l) => {
      const item = byId.get(l.menu_item_id);
      const optionIds = l.modifier_option_ids ?? [];
      const options = (item?.modifier_groups ?? [])
        .flatMap((g) => g.options)
        .filter((o) => optionIds.includes(o.id));

      return {
        uid: newLocalId(),
        menu_item_id: l.menu_item_id,
        name: l.name || item?.name || `Item #${l.menu_item_id}`,
        // The menu is the price authority for a cart; the order's stored unit
        // price is a record of what was quoted, and may be stale on recall.
        // Either way the server re-prices on send, so a difference surfaces as
        // a 409 rather than as a wrong charge.
        unit_price_minor: item?.price_minor ?? l.unit_price_minor,
        quantity: l.quantity,
        modifier_option_ids: [...optionIds].sort((a, b) => a - b),
        modifier_labels: options.map((o) => o.name),
        modifier_delta_minor: sumMinor(options.map((o) => o.price_delta_minor)),
        note: l.note ?? undefined,
        needs_prep: l.needs_prep ?? false,
        is_combo: item?.is_combo ?? false,
        // Recall keeps the prep flag the order was sent/parked with (falls back to
        // the item default if an older order read predates the field).
        needs_prep: l.needs_prep ?? item?.made_to_order ?? false,
      };
    });

  return {
    local_id: order.local_id,
    lines,
    channel: order.channel,
    order_type: order.order_type,
    customer_id: order.customer_id,
    vehicle_plate: order.vehicle_plate ?? "",
    vehicle_colour: order.vehicle_colour ?? "",
    bay_no: order.bay_no ?? "",
    order_id: order.id,
  };
}

/** Exported for tests. Two adds collapse into one row only when this holds. */
export function sameLine(a: CartLine, b: Omit<CartLine, "uid">): boolean {
  return (
    a.menu_item_id === b.menu_item_id &&
    a.note === b.note &&
    // A made-to-order line and a plain one of the same item are different work —
    // don't collapse them into one row.
    (a.needs_prep ?? false) === (b.needs_prep ?? false) &&
    a.modifier_option_ids.length === b.modifier_option_ids.length &&
    a.modifier_option_ids.every((id, i) => id === b.modifier_option_ids[i])
  );
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "add": {
      // Identical item + identical options + identical note collapses into one
      // row. A cashier tapping "Burger" four times wants qty 4, not four rows.
      const existing = state.lines.find((l) => sameLine(l, action.line));
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) =>
            l.uid === existing.uid ? { ...l, quantity: l.quantity + action.line.quantity } : l,
          ),
        };
      }
      return {
        ...state,
        lines: [...state.lines, { ...action.line, uid: newLocalId() }],
      };
    }
    case "setQty":
      return action.quantity <= 0
        ? { ...state, lines: state.lines.filter((l) => l.uid !== action.uid) }
        : {
            ...state,
            lines: state.lines.map((l) =>
              l.uid === action.uid ? { ...l, quantity: action.quantity } : l,
            ),
          };
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.uid !== action.uid) };
    case "setNote":
      return {
        ...state,
        lines: state.lines.map((l) => (l.uid === action.uid ? { ...l, note: action.note } : l)),
      };
    case "setNeedsPrep":
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.uid === action.uid ? { ...l, needs_prep: action.needs_prep } : l,
        ),
      };
    case "patch":
      return { ...state, ...action.patch };
    case "reset":
      return emptyCart();
    case "hydrate":
      return action.state;
  }
}

/** A line's price including its modifiers, times quantity. Integers throughout. */
export function lineTotalMinor(line: CartLine): Minor {
  return multiplyMinor(line.unit_price_minor + line.modifier_delta_minor, line.quantity);
}

export function cartSubtotalMinor(lines: readonly CartLine[]): Minor {
  return sumMinor(lines.map(lineTotalMinor));
}

interface CartValue {
  cart: CartState;
  subtotalMinor: Minor;
  itemCount: number;
  addItem: (item: MenuItem, optionIds: number[], note?: string, needsPrep?: boolean) => void;
  setQty: (uid: string, qty: number) => void;
  remove: (uid: string) => void;
  setNote: (uid: string, note: string) => void;
  setNeedsPrep: (uid: string, needsPrep: boolean) => void;
  patch: (patch: Partial<CartState>) => void;
  reset: () => void;
  toCreateInput: () => PosOrderCreate;
  /** Load a parked order back onto the till. */
  hydrateFrom: (order: PosOrder, menu: readonly MenuItem[]) => void;
}

const Ctx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(reducer, null, emptyCart);

  // Survive a reload — a crashed tab mid-order must not lose the customer's
  // cart, and `local_id` must come back with it or the order forks in two.
  useEffect(() => {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return;
    try {
      dispatch({ type: "hydrate", state: JSON.parse(raw) as CartState });
    } catch {
      window.localStorage.removeItem(CART_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addItem = useCallback(
    (item: MenuItem, optionIds: number[], note?: string, needsPrep = false) => {
      const options = item.modifier_groups
        .flatMap((g) => g.options)
        .filter((o) => optionIds.includes(o.id));

    dispatch({
      type: "add",
      line: {
        menu_item_id: item.id,
        name: item.name,
        unit_price_minor: item.price_minor,
        quantity: 1,
        modifier_option_ids: [...optionIds].sort((a, b) => a - b),
        modifier_labels: options.map((o) => o.name),
        modifier_delta_minor: sumMinor(options.map((o) => o.price_delta_minor)),
        note,
        is_combo: item.is_combo,
        // A made-to-order dish routes to the sub-kitchen by default; the cashier
        // can still toggle it off per line.
        needs_prep: item.made_to_order ?? false,
      },
    });
  }, []);

  const value = useMemo<CartValue>(() => {
    const subtotalMinor = cartSubtotalMinor(cart.lines);
    return {
      cart,
      subtotalMinor,
      itemCount: cart.lines.reduce((n, l) => n + l.quantity, 0),
      addItem,
      setQty: (uid, quantity) => dispatch({ type: "setQty", uid, quantity }),
      remove: (uid) => dispatch({ type: "remove", uid }),
      setNote: (uid, note) => dispatch({ type: "setNote", uid, note }),
      setNeedsPrep: (uid, needs_prep) => dispatch({ type: "setNeedsPrep", uid, needs_prep }),
      patch: (patch) => dispatch({ type: "patch", patch }),
      reset: () => dispatch({ type: "reset" }),
      hydrateFrom: (order, menu) =>
        dispatch({ type: "hydrate", state: cartFromOrder(order, menu) }),
      toCreateInput: () => ({
        local_id: cart.local_id,
        lines: cart.lines.map((l) => ({
          menu_item_id: l.menu_item_id,
          quantity: l.quantity,
          modifier_option_ids: l.modifier_option_ids.length ? l.modifier_option_ids : undefined,
          note: l.note || undefined,
          // Send the resolved per-line flag (already defaulted from the item's
          // made_to_order when the line was added).
          needs_prep: l.needs_prep,
        })),
        channel: cart.channel,
        order_type: cart.order_type,
        customer_id: cart.customer_id ?? undefined,
        // The proposal. Subtotal only — tax is the server's to add, and under
        // the PK pack it isn't even knowable until the tender is chosen.
        expected_total_minor: subtotalMinor,
        vehicle_plate: cart.vehicle_plate || undefined,
        vehicle_colour: cart.vehicle_colour || undefined,
        bay_no: cart.bay_no || undefined,
      }),
    };
  }, [cart, addItem]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

// ---- Modifier validation ----

export interface ModifierValidation {
  ok: boolean;
  /** Per-group message, keyed by group id. */
  errors: Record<number, string>;
}

/**
 * Client-side mirror of the server's `modifier_min_not_met` /
 * `modifier_max_exceeded` rules.
 *
 * Convenience, not security — the server checks independently and is the one
 * that counts. The point is that "choose at least one sauce" should be a
 * disabled button, not a 409 in front of a queue.
 */
export function validateModifiers(
  groups: readonly MenuModifierGroup[],
  selected: readonly number[],
): ModifierValidation {
  const errors: Record<number, string> = {};

  for (const group of groups) {
    const chosen = group.options.filter((o) => selected.includes(o.id)).length;
    if (chosen < group.min_select) {
      const need = group.min_select - chosen;
      errors[group.id] =
        group.min_select === 1 && chosen === 0
          ? `Choose an option`
          : `Choose ${need} more`;
    } else if (group.max_select > 0 && chosen > group.max_select) {
      errors[group.id] = `Choose at most ${group.max_select}`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
