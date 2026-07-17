/**
 * POS capability gating.
 *
 * The server already collapsed `position` AND device profile into the
 * capability list on `/pos/session/bootstrap`, so this module is a *reader*,
 * not a re-implementation. That is the whole point: the real rule is
 * `capabilities_for(user) ∩ capabilities_of(device)` — a CASHIER on a curbside
 * tablet still cannot take cash, because there is no drawer — and re-deriving
 * that intersection client-side would produce a second matrix that drifts from
 * the server's. Drift here presents as a button that 403s in front of a queue.
 *
 * So: never gate POS UI on `position`. Gate on `has(caps, "PAYMENT_CASH")`.
 */

import type { Capability, PosBootstrap } from "@/lib/types/pos";

export function has(caps: readonly Capability[], cap: Capability): boolean {
  return caps.includes(cap);
}

export function hasAny(caps: readonly Capability[], ...wanted: Capability[]): boolean {
  return wanted.some((c) => caps.includes(c));
}

export function hasAll(caps: readonly Capability[], ...wanted: Capability[]): boolean {
  return wanted.every((c) => caps.includes(c));
}

/**
 * Whether this terminal + user combination may take cash.
 *
 * Not the same question as "is this person a cashier". A CURBSIDE device has no
 * drawer and the server refuses cash from it (`device_cannot_take_cash`)
 * regardless of who is signed in — so the button must be hidden, not merely
 * left to 403. The server's capability list already reflects the device, but
 * the profile is checked too: belt and braces on the one control whose failure
 * mode is an argument with a customer holding banknotes.
 */
export function canTakeCash(bootstrap: PosBootstrap): boolean {
  if (bootstrap.device.profile === "CURBSIDE") return false;
  return has(bootstrap.capabilities, "PAYMENT_CASH");
}

/** Card/wallet. Curbside may or may not have this — the server decides. */
export function canTakeNonCash(bootstrap: PosBootstrap): boolean {
  return has(bootstrap.capabilities, "PAYMENT_TAKE");
}

export function canTakeAnyPayment(bootstrap: PosBootstrap): boolean {
  return canTakeCash(bootstrap) || canTakeNonCash(bootstrap);
}

/**
 * The payment methods worth showing on this terminal.
 *
 * Intersects the pack's supported methods with what this device+user may
 * actually do, so a curbside tablet never renders a cash tile it would be
 * refused for.
 */
export function availablePaymentMethods(bootstrap: PosBootstrap): string[] {
  return bootstrap.pack.payment_methods.filter((m) =>
    m === "CASH" ? canTakeCash(bootstrap) : canTakeNonCash(bootstrap),
  );
}

/**
 * Which country's rules this branch actually bills under.
 *
 * The guide is inconsistent about where this lives — §0.3 refers to
 * `pack.country_code`, the §3 sample puts `country_code` on `branch` — so both
 * are read, pack first. Either way the answer comes from the server and never
 * from the operator's region pick, which is the whole point of §0.3.
 */
export function packCountryCode(bootstrap: PosBootstrap): string {
  return bootstrap.pack.country_code ?? bootstrap.branch.country_code;
}

/**
 * A human explanation for why an action is missing. Used for empty states, not
 * for decisions — a user who understands why the cash button is absent doesn't
 * call support.
 */
export function explainNoCash(bootstrap: PosBootstrap): string {
  if (bootstrap.device.profile === "CURBSIDE") {
    return "This terminal has no cash drawer.";
  }
  if (bootstrap.user.position) {
    return `Your position (${bootstrap.user.position.toLowerCase().replace(/_/g, " ")}) can't take cash.`;
  }
  return "You don't have permission to take cash.";
}
