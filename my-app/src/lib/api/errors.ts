/**
 * Error codes and typed `details` narrowing.
 *
 * Branch on `code`, never on `message` — the guide is explicit that codes are
 * stable and messages are not. `isApiCode(err, "price_mismatch")` is the
 * intended call site; `err.message.includes("price")` is how this breaks.
 *
 * The `details` shapes below are read defensively. The wiring guide documents
 * `details` per code but not always its exact keys, so every accessor tolerates
 * absence and the UI degrades to the server's `message` rather than throwing
 * inside an error handler — which is the worst place to throw.
 */

import { ApiError } from "@/lib/types/super-admin";
import type { Minor } from "@/lib/money";

export const POS_ERROR = {
  // Pricing
  PRICE_MISMATCH: "price_mismatch",
  PRODUCT_NOT_PRICED: "product_not_priced",
  PRODUCT_UNAVAILABLE: "product_unavailable",
  // Idempotency
  IDEMPOTENCY_KEY_REUSE: "idempotency_key_reuse",
  // Device / session
  UNKNOWN_DEVICE: "unknown_device",
  DEVICE_BRANCH_MISMATCH: "device_branch_mismatch",
  DEVICE_NOT_BOUND: "device_not_bound",
  DEVICE_CANNOT_TAKE_CASH: "device_cannot_take_cash",
  // Orders
  ITEM_UNAVAILABLE: "item_unavailable",
  INVALID_MODIFIER: "invalid_modifier",
  MODIFIER_MIN_NOT_MET: "modifier_min_not_met",
  MODIFIER_MAX_EXCEEDED: "modifier_max_exceeded",
  INSUFFICIENT_STOCK: "insufficient_stock",
  INVALID_ORDER_STATUS: "invalid_order_status",
  // Payments
  OVERPAYMENT: "overpayment",
  TENDER_REQUIRED: "tender_required",
  // Approvals
  DISCOUNT_NEEDS_APPROVAL: "discount_needs_approval",
  VARIANCE_NEEDS_APPROVAL: "variance_needs_approval",
  // Menu
  MENU_VERSION_IMMUTABLE: "menu_version_immutable",
  // Feed
  WINDOW_TOO_LARGE: "window_too_large",
  // Branch
  INVALID_PRODUCTION_RUN: "invalid_production_run",
  // Product kind — a sack of flour is not a menu item, and the server says so
  // rather than trusting the UI to have hidden the field.
  PRODUCT_NOT_SELLABLE: "product_not_sellable",
  PRODUCT_CANNOT_HAVE_RECIPE: "product_cannot_have_recipe",
  NESTED_RECIPE_UNSUPPORTED: "nested_recipe_unsupported",
  NO_ACTIVE_RECIPE: "no_active_recipe",
  NOT_A_FINISHED_GOOD: "not_a_finished_good",
  // Device registry
  DEVICE_EXISTS: "device_exists",
  DEVICE_CODE_EXISTS: "device_code_exists",
} as const;

export type PosErrorCode = (typeof POS_ERROR)[keyof typeof POS_ERROR];

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function isApiCode(err: unknown, ...codes: string[]): err is ApiError {
  return isApiError(err) && !!err.code && codes.includes(err.code);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

// ---- price_mismatch ----

/**
 * One line the device got wrong. The POS surface keys by `menu_item_id` and
 * minor units; the Phase 5 branch surface keys by `product_id` and decimal
 * strings. Both are read here rather than in two near-identical guards.
 */
export interface PriceMismatchLine {
  label: string;
  proposed: string | null;
  server: string | null;
}

export interface PriceMismatchDetails {
  /** Server's authoritative total, when the server sent one (POS surface). */
  serverTotalMinor: Minor | null;
  proposedTotalMinor: Minor | null;
  /** Per-line breakdown, when the server sent one (branch surface). */
  lines: PriceMismatchLine[];
}

function str(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

/**
 * Pull whatever the server told us about a price mismatch into one shape.
 *
 * Deliberately forgiving: a mismatch dialog that crashes because a key was
 * named `server_total_minor` instead of `total_minor` is strictly worse than
 * one that shows the message and the lines it did understand.
 */
export function readPriceMismatch(err: ApiError): PriceMismatchDetails {
  const d = record(err.details) ?? {};

  const rawLines = Array.isArray(d.lines) ? d.lines : [];
  const lines: PriceMismatchLine[] = rawLines.flatMap((entry) => {
    const line = record(entry);
    if (!line) return [];
    const label =
      str(line.product_name) ??
      str(line.name) ??
      (line.menu_item_id != null
        ? `Item #${str(line.menu_item_id)}`
        : line.product_id != null
          ? `Product #${str(line.product_id)}`
          : "Line");
    const proposed =
      str(line.proposed_unit_price) ??
      str(line.proposed) ??
      str(line.unit_price) ??
      str(line.proposed_unit_price_minor) ??
      str(line.proposed_minor);
    const server =
      str(line.server_unit_price) ??
      str(line.server) ??
      str(line.expected_unit_price) ??
      str(line.server_unit_price_minor) ??
      str(line.server_minor);
    return [{ label, proposed, server }];
  });

  return {
    serverTotalMinor:
      int(d.server_total_minor) ?? int(d.total_minor) ?? int(d.actual_total_minor),
    proposedTotalMinor: int(d.expected_total_minor) ?? int(d.proposed_total_minor),
    lines,
  };
}

// ---- overpayment / discount / variance ----

/** `details.due_minor` — what is actually still owed. */
export function readDueMinor(err: ApiError): Minor | null {
  const d = record(err.details);
  return d ? (int(d.due_minor) ?? int(d.amount_due_minor)) : null;
}

/** `details.limit_bp` — the ceiling this user may approve unaided. */
export function readLimitBp(err: ApiError): number | null {
  const d = record(err.details);
  return d ? (int(d.limit_bp) ?? int(d.max_pct_bp)) : null;
}

/**
 * Errors that mean "a manager must stand here and authorise this", as opposed
 * to "you did something wrong". These drive the PIN-escalation prompt rather
 * than an error toast.
 */
export function needsManagerApproval(err: unknown): err is ApiError {
  return isApiCode(err, POS_ERROR.DISCOUNT_NEEDS_APPROVAL, POS_ERROR.VARIANCE_NEEDS_APPROVAL);
}

/**
 * Device/session faults. Every one of these means the token is unusable, so the
 * only sensible response is to bounce to sign-in — retrying cannot help.
 */
export function isDeviceFault(err: unknown): err is ApiError {
  return isApiCode(
    err,
    POS_ERROR.UNKNOWN_DEVICE,
    POS_ERROR.DEVICE_BRANCH_MISMATCH,
    POS_ERROR.DEVICE_NOT_BOUND,
  );
}

/**
 * A human sentence for the codes where the server's own message is too terse to
 * put in front of a cashier mid-queue. Falls back to the server's message —
 * which is always safe, just sometimes not kind.
 */
export function posErrorMessage(err: unknown): string {
  if (!isApiError(err)) {
    return err instanceof Error ? err.message : "Something went wrong";
  }
  switch (err.code) {
    case POS_ERROR.ITEM_UNAVAILABLE:
      return "That item just went out of stock. Remove it to continue.";
    case POS_ERROR.INSUFFICIENT_STOCK:
      return "Not enough stock to send this order.";
    case POS_ERROR.MODIFIER_MIN_NOT_MET:
      return "This item needs more options chosen.";
    case POS_ERROR.MODIFIER_MAX_EXCEEDED:
      return "Too many options chosen for this item.";
    case POS_ERROR.INVALID_MODIFIER:
      return "One of the chosen options isn't valid for this item.";
    case POS_ERROR.TENDER_REQUIRED:
      return "Enter the amount the customer handed over.";
    case POS_ERROR.DEVICE_CANNOT_TAKE_CASH:
      return "This terminal has no cash drawer. Take payment by card or wallet.";
    case POS_ERROR.DEVICE_NOT_BOUND:
      return "This session isn't bound to a terminal. Sign in again on the till.";
    case POS_ERROR.UNKNOWN_DEVICE:
      return "This terminal isn't registered. Ask an admin to add it.";
    case POS_ERROR.DEVICE_BRANCH_MISMATCH:
      return "This terminal belongs to a different branch.";
    case POS_ERROR.IDEMPOTENCY_KEY_REUSE:
      // The guide calls this "a client bug" outright. Say so in dev; the user
      // can't act on it either way.
      return "This request was replayed with different contents. Start it again.";
    case POS_ERROR.INVALID_ORDER_STATUS:
      return "That order has already moved on. Reload it.";
    case POS_ERROR.MENU_VERSION_IMMUTABLE:
      return "This menu version is published and can't be edited. Create a new version.";
    case POS_ERROR.INVALID_PRODUCTION_RUN:
      return "A production run needs at least one input and one output.";
    case POS_ERROR.WINDOW_TOO_LARGE:
      return "That date range is too wide — 400 days is the maximum.";
    case POS_ERROR.PRODUCT_NOT_SELLABLE:
      return "That's a raw material — it can't be priced or put on a menu.";
    case POS_ERROR.PRODUCT_CANNOT_HAVE_RECIPE:
      return "Only kitchen-made items can have a recipe.";
    case POS_ERROR.NESTED_RECIPE_UNSUPPORTED:
      // The likely mistake: picking a burger as an ingredient of a meal.
      return "A recipe's ingredients must be raw materials or resale items, not other made items.";
    case POS_ERROR.NO_ACTIVE_RECIPE:
      return "This item has no recipe yet, so the kitchen can't make it.";
    case POS_ERROR.NOT_A_FINISHED_GOOD:
      return "Only kitchen-made items can be produced.";
    case POS_ERROR.DEVICE_EXISTS:
    case POS_ERROR.DEVICE_CODE_EXISTS:
      return "That terminal is already registered — just sign in on it.";
    default:
      return err.message;
  }
}
