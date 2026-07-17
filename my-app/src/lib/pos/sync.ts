/**
 * The outbox drainer.
 *
 * Conflict policy, restated because it is the part that is easy to "fix" into
 * being wrong: **the device wins for facts, the server wins for rules.** If the
 * price moved while this terminal was offline, the order is *accepted and
 * flagged* — not rejected (the sale happened; the money is already in the
 * drawer) and not silently re-priced (that hides a real discrepancy from the
 * person whose job is to find it). Our only job on `flagged` is to keep it
 * visible until a manager rules on it.
 */

import { posApi } from "@/lib/api/pos.api";
import { isOfflineError } from "@/lib/api/pos-client";
import { SYNC_BATCH_MAX, type SyncEnvelope } from "@/lib/types/pos";
import { outbox, type OutboxRecord } from "./outbox";

export interface SyncRunResult {
  attempted: number;
  accepted: number;
  duplicates: number;
  flagged: number;
  failed: number;
  offline: boolean;
}

const EMPTY: SyncRunResult = {
  attempted: 0,
  accepted: 0,
  duplicates: 0,
  flagged: 0,
  failed: 0,
  offline: false,
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toEnvelope(r: OutboxRecord): SyncEnvelope {
  return { order: r.order, device_total_minor: r.device_total_minor };
}

/**
 * Single-flight. A drain triggered by "back online" and one triggered by the
 * poll timer must not both post the same envelopes — the server would dedupe
 * them, but we'd be spending a queue's worth of bandwidth to be told so.
 */
let inFlight: Promise<SyncRunResult> | null = null;

export function drainOutbox(): Promise<SyncRunResult> {
  if (!inFlight) {
    inFlight = run().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function run(): Promise<SyncRunResult> {
  const pending = await outbox.pending();
  if (!pending.length) return EMPTY;

  const totals: SyncRunResult = { ...EMPTY, attempted: pending.length };

  // Ordered, oldest first, and chunked to the server's cap. Going over it 422s
  // the whole call rather than partially accepting, so the chunk size is a
  // contract, not a tuning knob.
  for (const batch of chunk(pending, SYNC_BATCH_MAX)) {
    try {
      const res = await posApi.syncBatch(batch.map(toEnvelope));

      for (const element of res.results) {
        totals[
          element.status === "duplicate"
            ? "duplicates"
            : element.status === "accepted"
              ? "accepted"
              : element.status === "flagged"
                ? "flagged"
                : "failed"
        ] += 1;

        await outbox.update(element.local_id, {
          result: element.status,
          order_id: element.order_id,
          last_error: element.message,
        });
      }

      // A local_id the server didn't mention is still owed — count the attempt
      // so a permanently-ignored record can't loop silently forever.
      const reported = new Set(res.results.map((r) => r.local_id));
      for (const record of batch) {
        if (!reported.has(record.local_id)) {
          await outbox.update(record.local_id, {
            attempts: record.attempts + 1,
            last_error: "No result returned for this order",
          });
        }
      }
    } catch (err) {
      if (isOfflineError(err)) {
        // Still offline. Leave every record exactly as it was and stop — the
        // next chunk would fail identically, and burning through them would
        // just inflate the attempt counts.
        return { ...totals, offline: true };
      }
      // A whole-batch rejection (auth, 429, 5xx). Bump attempts and keep the
      // records: all-or-nothing per batch is survivable, dropping them is not.
      for (const record of batch) {
        await outbox.update(record.local_id, {
          attempts: record.attempts + 1,
          last_error: err instanceof Error ? err.message : "Sync failed",
        });
      }
      totals.failed += batch.length;
    }
  }

  // Accepted/duplicate are done with; `flagged` stays until a manager rules.
  await outbox.pruneSettled();

  return totals;
}
