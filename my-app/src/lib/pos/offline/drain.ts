/**
 * The drain — replay the outbox against the backend on reconnect (§9, §13).
 *
 * The rules this file encodes, all load-bearing:
 *
 * - **Strict stage order: orders → payments → print-results.** A payment
 *   references an order that must exist server-side first; the order stage
 *   records each `local_id → order_id`, and the payment stage resolves against
 *   it. (Requisitions are the fourth stage in §13; they drain here once a
 *   producer and their cross-location token model exist — no flow queues them
 *   yet, so shipping that call now would be untested speculation.)
 * - **Chunk orders to ≤50** — over 50 is `409 batch_too_large`.
 * - **Per-element, never all-or-nothing.** One rejected envelope is marked
 *   failed for backoff; the rest still settle.
 * - **`duplicate` is success** — a replay the server already saw. Remove it.
 * - **Offline aborts the run, doesn't fail entries.** A `PosNetworkError` means
 *   we're offline again: release the in-flight claim and stop, so nothing is
 *   penalised with backoff for the network dropping.
 * - **Single-flight.** Overlapping triggers (mount + `online` event + interval)
 *   must not double-send; a module guard serialises them, and per-entry
 *   `in_flight` guards within a run.
 */

import { posApi } from "@/lib/api/pos.api";
import { isNetworkError } from "@/lib/api/pos-client";
import { newIdempotencyKey } from "@/lib/pos/idempotency";
import { deviceServices } from "./device-services";
import { isDue, type OutboxEntryOf } from "./outbox";
import { lookupOrderId, recordFlagged, rememberOrderId } from "./sync-state";
import type { SyncEnvelope } from "@/lib/types/pos";

const MAX_BATCH = 50;

export interface StageCounts {
  processed: number;
  settled: number;
  failed: number;
  flagged: number;
  /** Deferred to a later pass (e.g. a payment whose order hasn't synced yet). */
  skipped: number;
}

function counts(): StageCounts {
  return { processed: 0, settled: 0, failed: 0, flagged: 0, skipped: 0 };
}

export interface DrainSummary {
  /** False when the run was skipped because another drain was already in flight. */
  ran: boolean;
  orders: StageCounts;
  payments: StageCounts;
  printResults: StageCounts;
  /** The run stopped early because the network dropped again. */
  stoppedOffline: boolean;
}

const outbox = deviceServices.outbox;
let draining = false;

export async function drainOutbox(): Promise<DrainSummary> {
  const summary: DrainSummary = {
    ran: false,
    orders: counts(),
    payments: counts(),
    printResults: counts(),
    stoppedOffline: false,
  };
  if (draining) return summary;
  draining = true;
  try {
    summary.ran = true;
    if (await drainOrders(summary.orders)) return (summary.stoppedOffline = true), summary;
    if (await drainPayments(summary.payments)) return (summary.stoppedOffline = true), summary;
    if (await drainPrintResults(summary.printResults)) {
      return (summary.stoppedOffline = true), summary;
    }
    return summary;
  } finally {
    draining = false;
  }
}

function toEnvelope(entry: OutboxEntryOf<"order">): SyncEnvelope {
  const b = entry.body;
  return {
    order: b.order,
    device_total_minor: b.device_total_minor,
    was_sent: b.was_sent,
    device_sent_at: b.device_sent_at ?? undefined,
    print_results: b.print_results,
  };
}

/** @returns true if the run should stop because we're offline. */
async function drainOrders(c: StageCounts): Promise<boolean> {
  const due = (await outbox.byKind("order")).filter((e) => isDue(e));

  for (let i = 0; i < due.length; i += MAX_BATCH) {
    const chunk = due.slice(i, i + MAX_BATCH);
    await Promise.all(chunk.map((e) => outbox.markInFlight(e.id)));

    let res;
    try {
      res = await posApi.syncBatch({ envelopes: chunk.map(toEnvelope) });
    } catch (err) {
      if (isNetworkError(err)) {
        await Promise.all(chunk.map((e) => outbox.reset(e.id)));
        return true;
      }
      // A batch-level rejection (e.g. 422). Back each element off individually.
      const msg = err instanceof Error ? err.message : "sync failed";
      for (const e of chunk) {
        await outbox.markFailed(e.id, msg);
        c.processed += 1;
        c.failed += 1;
      }
      continue;
    }

    const byLocal = new Map(chunk.map((e) => [e.body.order.local_id, e]));
    const handled = new Set<string>();

    for (const r of res.results) {
      const entry = byLocal.get(r.local_id);
      if (!entry) continue;
      handled.add(entry.id);
      c.processed += 1;

      if (r.status === "failed") {
        await outbox.markFailed(entry.id, r.error ?? "rejected");
        c.failed += 1;
        continue;
      }

      // accepted | duplicate | flagged — all mean "the server has it". Record
      // the id so queued payments can resolve, note any flag for review, drop it.
      if (r.order_id != null) await rememberOrderId(r.local_id, r.order_id);
      if (r.status === "flagged" || r.flagged_reason || r.stock_flagged) {
        await recordFlagged({
          local_id: r.local_id,
          order_id: r.order_id ?? null,
          reason: r.flagged_reason ?? null,
          server_total_minor: r.server_total_minor ?? null,
          device_total_minor: entry.body.device_total_minor,
          flagged_at: new Date().toISOString(),
        });
        c.flagged += 1;
      }
      await outbox.remove(entry.id);
      c.settled += 1;
    }

    // Any envelope the server didn't mention stays queued — release its claim
    // so the next pass retries it rather than leaving it stuck in_flight.
    for (const e of chunk) {
      if (!handled.has(e.id)) await outbox.reset(e.id);
    }
  }
  return false;
}

async function drainPayments(c: StageCounts): Promise<boolean> {
  const due = (await outbox.byKind("payment")).filter((e) => isDue(e));

  for (const entry of due) {
    const orderId = await lookupOrderId(entry.body.order_local_id);
    if (!orderId) {
      // The order hasn't settled yet — try again next pass, don't fail it.
      c.skipped += 1;
      continue;
    }

    await outbox.markInFlight(entry.id);
    try {
      // client_payment_id in the body makes this replay-safe; the fresh
      // Idempotency-Key is per-attempt transport dedup.
      await posApi.pay(orderId, entry.body.payment, newIdempotencyKey());
    } catch (err) {
      if (isNetworkError(err)) {
        await outbox.reset(entry.id);
        return true;
      }
      await outbox.markFailed(entry.id, err instanceof Error ? err.message : "payment failed");
      c.processed += 1;
      c.failed += 1;
      continue;
    }
    await outbox.remove(entry.id);
    c.processed += 1;
    c.settled += 1;
  }
  return false;
}

async function drainPrintResults(c: StageCounts): Promise<boolean> {
  const due = (await outbox.byKind("print_result")).filter((e) => isDue(e));
  if (due.length === 0) return false;

  await Promise.all(due.map((e) => outbox.markInFlight(e.id)));
  try {
    await posApi.printResults(
      due.map((e) => ({
        print_job_id: e.body.print_job_id,
        state: e.body.state,
        error: e.body.error ?? null,
      })),
    );
  } catch (err) {
    if (isNetworkError(err)) {
      await Promise.all(due.map((e) => outbox.reset(e.id)));
      return true;
    }
    const msg = err instanceof Error ? err.message : "print report failed";
    for (const e of due) {
      await outbox.markFailed(e.id, msg);
      c.processed += 1;
      c.failed += 1;
    }
    return false;
  }

  for (const e of due) {
    await outbox.remove(e.id);
    c.processed += 1;
    c.settled += 1;
  }
  return false;
}
