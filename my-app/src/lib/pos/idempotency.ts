/**
 * Two dedupe mechanisms that are constantly confused. They are not the same and
 * you need both.
 *
 * **`Idempotency-Key`** is *transport* dedupe: one HTTP attempt that may be
 * retried. Mint it **per user intent**, not per retry — the whole point is that
 * every retry of "charge this card" carries the SAME key, so the server replays
 * the original result instead of charging twice. Reusing a key with a
 * *different* body is a client bug and earns a 422 `idempotency_key_reuse`.
 *
 * **`local_id`** is *business* dedupe: this is one order the device minted, and
 * it is the same order forever. Minted once when the cart is created, persisted
 * with the cart, and reused on every submission of it — including a replay from
 * a rebuilt offline queue weeks later carrying a brand-new `Idempotency-Key`.
 *
 * The rule that follows: a key belongs to an *attempt at an intent*; a local_id
 * belongs to an *order*. One cart has one local_id and potentially several keys
 * (send the order, then take a payment, then take another payment).
 */

/**
 * `crypto.randomUUID` needs a secure context (HTTPS or localhost). A till on
 * plain HTTP over a LAN is exactly the deployment where it is missing, so fall
 * back rather than throw — a v4-shaped id from `getRandomValues` is equally
 * unique for dedupe, and `Math.random` is the last resort.
 */
export function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, "0"));
  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

/** Mint once per user intent. Reuse across retries of that same intent. */
export function newIdempotencyKey(): string {
  return uuid();
}

/** Mint once per cart, persist it, never regenerate. */
export function newLocalId(): string {
  return uuid();
}
