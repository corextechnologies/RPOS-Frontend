/**
 * Recording demand the till turns away offline (§2 — the offline half).
 *
 * When an online order is refused, the server records it from the 409 itself —
 * nothing to do here. Offline the device is the only witness: it decided the
 * item was unavailable from its own cached stock, so if it doesn't queue the
 * turn-away and send it on reconnect, the refusal is lost — and outages are
 * exactly when sell-outs spike. This module queues it durably (persist-before-
 * send, like an order); {@link drainOutbox} replays it in the sync batch's
 * `refusals` list.
 */

import { newLocalId } from "@/lib/pos/idempotency";
import type { RefusalReason } from "@/lib/types/pos";
import { deviceServices } from "./device-services";
import type { OutboxEntryOf } from "./outbox";

export interface RecordRefusalInput {
  menu_item_id: number;
  reason: RefusalReason;
  /** What the customer asked for. */
  requested_units: number;
  /** What we could have supplied — 0 when empty. */
  available_units: number;
  /**
   * When the customer was turned away. Defaults to now; pass it explicitly only
   * to backdate. A refusal replayed hours later must still land on the day it
   * happened, which the stamped `occurred_at` (not the upload time) guarantees.
   */
  occurred_at?: string;
  note?: string;
}

/**
 * Queue a demand refusal for the next sync.
 *
 * The minted `local_id` is the dedup anchor — the server dedupes on it forever,
 * so a retried upload never double-counts. `enqueue` is itself idempotent on the
 * anchor, so a double-tap can't fork one turn-away into two.
 */
export function enqueueRefusal(input: RecordRefusalInput): Promise<OutboxEntryOf<"refusal">> {
  const localId = newLocalId();
  return deviceServices.outbox.enqueue({
    kind: "refusal",
    anchor: localId,
    body: {
      local_id: localId,
      menu_item_id: input.menu_item_id,
      reason: input.reason,
      requested_units: input.requested_units,
      available_units: input.available_units,
      occurred_at: input.occurred_at ?? new Date().toISOString(),
      ...(input.note ? { note: input.note } : {}),
    },
  });
}
