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
  DEVICE_REVOKED: "device_revoked",
  // Pairing / activation
  DEVICE_UID_MISSING: "device_uid_missing",
  DEVICE_UID_IN_USE: "device_uid_in_use",
  INVALID_ACTIVATION_CODE: "invalid_activation_code",
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

// ---- insufficient_stock ----

/**
 * The rich `insufficient_stock` payload, now returned on every shortfall path:
 * dispatch, allocation, POS/branch sale, kitchen production, and waste/adjust.
 *
 * The one field that changes the meaning is `batchCode`:
 * - **absent** → `available` is the product-wide total at that location (a sale
 *   sees the branch's on-hand; a dispatch sees the sum across in-date batches).
 * - **present** → the shortfall is scoped to that one batch, and `available` is
 *   that batch's on-hand, not the product total. This is how production-input
 *   and waste/adjust shortfalls arrive, because those operations target a batch.
 *
 * Every field is read defensively — a shortfall dialog that throws because a
 * key was missing is worse than one that falls back to the server's message,
 * and it throws inside an error handler, the worst place to throw.
 */
export interface InsufficientStockDetails {
  productId: number | null;
  productName: string | null;
  locationType: string | null;
  locationId: number | null;
  requested: number | null;
  available: number | null;
  /** Present only on batch-scoped shortfalls; `available` then means this batch. */
  batchCode: string | null;
}

export function readInsufficientStock(err: ApiError): InsufficientStockDetails {
  const d = record(err.details) ?? {};
  return {
    productId: int(d.product_id),
    productName: str(d.product_name),
    locationType: str(d.location_type),
    locationId: int(d.location_id),
    requested: int(d.requested),
    available: int(d.available),
    batchCode: str(d.batch_code),
  };
}

/**
 * A cashier-ready sentence for a stock shortfall.
 *
 * The batch rule drives the copy, exactly as the backend spelled it out:
 * batch present → "Only 2 of batch B-CH-26 on hand, 5 requested"; batch absent
 * → "Not enough Cheese — 2 available, 5 requested". Falls back to the plain
 * message whenever the payload is missing or unrecognised — the defensive path
 * the backend asked us to keep even though every known raise site is enriched.
 */
export function insufficientStockMessage(err: ApiError): string {
  const d = readInsufficientStock(err);
  const name = d.productName ?? "this item";

  // Need at least the two numbers to say anything specific.
  if (d.available == null || d.requested == null) {
    return err.message || "Not enough stock for this.";
  }

  if (d.batchCode) {
    return `Only ${d.available} of batch ${d.batchCode} on hand, ${d.requested} requested.`;
  }
  return `Not enough ${name} — ${d.available} available, ${d.requested} requested.`;
}

/**
 * Any error's message, upgraded to the rich shortfall copy when it's an
 * `insufficient_stock`. For the surfaces that toast with a bespoke fallback
 * ("Failed to write off stock") rather than through `posErrorMessage` — waste,
 * adjust, receive, and the like. Everything else keeps the caller's fallback.
 */
export function stockAwareMessage(err: unknown, fallback: string): string {
  if (isApiCode(err, POS_ERROR.INSUFFICIENT_STOCK)) {
    return insufficientStockMessage(err);
  }
  if (err instanceof ApiError || err instanceof Error) return err.message;
  return fallback;
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
 * only sensible response is to bounce out of the till — retrying cannot help.
 * `device_revoked` is here too: a revoked terminal's *current* session dies on
 * its next call, mid-service, not at token expiry.
 */
export function isDeviceFault(err: unknown): err is ApiError {
  return isApiCode(
    err,
    POS_ERROR.UNKNOWN_DEVICE,
    POS_ERROR.DEVICE_BRANCH_MISMATCH,
    POS_ERROR.DEVICE_NOT_BOUND,
    POS_ERROR.DEVICE_REVOKED,
  );
}

/**
 * Faults whose recovery is **re-pairing**: the terminal was revoked or rebound
 * elsewhere (`unknown_device`, `device_revoked`), or login found no uid anywhere
 * (`device_uid_missing`). The manager reissues a code and the device re-runs
 * activation — so the UI routes to the activation screen, not an error toast.
 *
 * `device_branch_mismatch` is deliberately excluded: that's the wrong *account*
 * on a fine terminal, and re-pairing wouldn't fix it.
 */
export function needsRepairing(err: unknown): err is ApiError {
  return isApiCode(
    err,
    POS_ERROR.UNKNOWN_DEVICE,
    POS_ERROR.DEVICE_REVOKED,
    POS_ERROR.DEVICE_UID_MISSING,
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
      // Rich now on every path — names the product, the shortfall, and the
      // batch when the operation targeted one. Falls back internally when the
      // payload is absent, so this never regresses to worse than before.
      return insufficientStockMessage(err);
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
      return "This terminal is no longer paired. Set it up again with a fresh activation code.";
    case POS_ERROR.DEVICE_REVOKED:
      return "This terminal was turned off by your branch manager. Set it up again to continue.";
    case POS_ERROR.DEVICE_UID_MISSING:
      return "This device isn't set up as a till yet. Enter an activation code to pair it.";
    case POS_ERROR.DEVICE_UID_IN_USE:
      return "This device is already paired to a different terminal. Revoke that one, or use a fresh device.";
    case POS_ERROR.INVALID_ACTIVATION_CODE:
      return "That code is wrong or expired — ask your manager to reissue it.";
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
    case POS_ERROR.DEVICE_CODE_EXISTS:
      return "That terminal name is already taken at this branch — pick another.";
    default:
      return err.message;
  }
}

/**
 * Friendly copy for an image-upload failure. Shared by every upload surface
 * (menu photo, logo, employee/kitchen-staff avatar) so the four call sites can't
 * drift. Branches on `code`, never `message`; falls back to the server message
 * (then a generic line) for anything unrecognised.
 */
export function imageUploadErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    switch (err.code) {
      case "invalid_image":
        return "Please choose a valid image file.";
      case "invalid_file_type":
        return "Please upload a JPEG, PNG, WebP or SVG.";
      case "file_too_large":
        return "Image must be under 10 MB.";
      case "storage_unavailable":
        return "Couldn't upload, please try again.";
      // A client bug — the caller sent a `kind` other than personal/cnic. The
      // user can't act on it, so keep the copy generic rather than leaking it.
      case "invalid_document_kind":
        return "Couldn't upload this document. Please try again.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Couldn't upload the image";
}
