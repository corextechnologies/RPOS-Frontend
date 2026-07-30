/**
 * Two small pieces of state the drain carries between its stages and across runs.
 *
 * 1. **The `local_id → order_id` map.** A payment queued offline references its
 *    order by `local_id` — there was no server id yet. When the order settles on
 *    sync the server assigns one, and the payment stage needs it to post to
 *    `/pos/orders/{id}/payments`. That resolution has to survive between drain
 *    runs (the order might settle in one pass and the payment drain in the next),
 *    so it's persisted, not just held in memory.
 *
 * 2. **The flagged-review list.** The server accepts an offline sale even when it
 *    disagrees with the device's price or finds stock oversold — accept + flag,
 *    never reject (§9). Those flags are recorded here for a manager to review;
 *    the till never blocks on them.
 */

import type { Minor } from "@/lib/money";
import type { FlaggedReason } from "@/lib/types/pos";
import { kvGet, kvSet } from "./db";

const ORDER_IDS_KEY = "sync:order-ids";
const FLAGGED_KEY = "sync:flagged";

// ---- local_id -> order_id ----

type OrderIdMap = Record<string, number>;

export async function rememberOrderId(localId: string, orderId: number): Promise<void> {
  const map = (await kvGet<OrderIdMap>(ORDER_IDS_KEY)) ?? {};
  if (map[localId] === orderId) return;
  map[localId] = orderId;
  await kvSet(ORDER_IDS_KEY, map);
}

export async function lookupOrderId(localId: string): Promise<number | null> {
  const map = await kvGet<OrderIdMap>(ORDER_IDS_KEY);
  return map?.[localId] ?? null;
}

// ---- flagged-for-review ----

export interface FlaggedOrder {
  local_id: string;
  order_id: number | null;
  reason: FlaggedReason | null;
  server_total_minor: Minor | null;
  device_total_minor: Minor | null;
  flagged_at: string;
}

export async function recordFlagged(entry: FlaggedOrder): Promise<void> {
  const list = (await kvGet<FlaggedOrder[]>(FLAGGED_KEY)) ?? [];
  // One row per order — a re-drain of the same local_id must not duplicate it.
  const next = list.filter((f) => f.local_id !== entry.local_id);
  next.push(entry);
  await kvSet(FLAGGED_KEY, next);
}

export async function readFlagged(): Promise<FlaggedOrder[]> {
  return (await kvGet<FlaggedOrder[]>(FLAGGED_KEY)) ?? [];
}

export async function dismissFlagged(localId: string): Promise<void> {
  const list = (await kvGet<FlaggedOrder[]>(FLAGGED_KEY)) ?? [];
  await kvSet(
    FLAGGED_KEY,
    list.filter((f) => f.local_id !== localId),
  );
}
