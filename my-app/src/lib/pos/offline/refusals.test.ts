/**
 * Offline refusals — §2's offline half: an item sells out during an outage, the
 * cashier logs the turn-away, and it reaches the backend on reconnect so the
 * forecast doesn't mistake a sold-out day for a quiet one.
 *
 * Like `drain.test.ts`, these run the real outbox (fake-indexeddb) against a
 * mocked `/pos` API, re-importing after stubbing because `drain.ts` binds
 * `deviceServices.outbox` and `posApi` at module load.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewOutboxEntry } from "./outbox";
import type { SyncBatchResult, SyncRefusal } from "@/lib/types/pos";

function refusalEntry(localId: string, over: Partial<SyncRefusal> = {}): NewOutboxEntry {
  return {
    kind: "refusal",
    anchor: localId,
    body: {
      local_id: localId,
      menu_item_id: 88,
      reason: "OUT_OF_STOCK",
      requested_units: 1,
      available_units: 0,
      occurred_at: "2026-08-05T19:12:00Z",
      ...over,
    },
  };
}

function batchResult(over: Partial<SyncBatchResult> = {}): SyncBatchResult {
  return { accepted: 0, duplicates: 0, flagged: 0, failed: 0, results: [], ...over };
}

/** Wire up a fresh module graph with the given API mock. */
async function setup(api: Record<string, unknown>) {
  const { IDBFactory } = await import("fake-indexeddb");
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.doMock("@/lib/api/pos.api", () => ({ posApi: api }));

  const drain = await import("./drain");
  const { idbOutbox } = await import("./outbox");
  const { enqueueRefusal } = await import("./refusals");
  return { ...drain, outbox: idbOutbox, enqueueRefusal };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/lib/api/pos.api");
  vi.unstubAllGlobals();
});

describe("refusal stage", () => {
  it("posts queued refusals as a refusals-only batch and clears them", async () => {
    const syncBatch = vi.fn().mockResolvedValue(batchResult({ refusals_recorded: 2 }));
    const { drainOutbox, outbox } = await setup({ syncBatch });

    await outbox.enqueue(refusalEntry("R1"));
    await outbox.enqueue(refusalEntry("R2", { menu_item_id: 99, requested_units: 3 }));

    const summary = await drainOutbox();

    expect(syncBatch).toHaveBeenCalledOnce();
    const arg = syncBatch.mock.calls[0][0];
    // No orders queued → a refusals-only post, which the endpoint allows.
    expect(arg.envelopes).toBeUndefined();
    expect(arg.refusals).toHaveLength(2);
    expect(arg.refusals[0]).toMatchObject({
      local_id: "R1",
      menu_item_id: 88,
      reason: "OUT_OF_STOCK",
      requested_units: 1,
      available_units: 0,
      occurred_at: "2026-08-05T19:12:00Z",
    });
    // The response only carries a count; a 2xx means the server durably has the
    // chunk (deduped by local_id), so the whole chunk is dropped.
    expect(summary.refusals.settled).toBe(2);
    expect(await outbox.count()).toBe(0);
  });

  it("chunks more than 50 refusals into separate batches", async () => {
    const syncBatch = vi.fn().mockResolvedValue(batchResult());
    const { drainOutbox, outbox } = await setup({ syncBatch });

    for (let i = 0; i < 51; i++) await outbox.enqueue(refusalEntry(`R${i}`));

    await drainOutbox();
    expect(syncBatch).toHaveBeenCalledTimes(2);
    expect(syncBatch.mock.calls[0][0].refusals).toHaveLength(50);
    expect(syncBatch.mock.calls[1][0].refusals).toHaveLength(1);
    expect(await outbox.count()).toBe(0);
  });

  it("aborts and requeues when the network drops mid-drain — no backoff penalty", async () => {
    const { PosNetworkError } = await import("@/lib/api/pos-client");
    const syncBatch = vi.fn().mockRejectedValue(new PosNetworkError("down"));
    const { drainOutbox, outbox } = await setup({ syncBatch });

    await outbox.enqueue(refusalEntry("R1"));

    const summary = await drainOutbox();
    expect(summary.stoppedOffline).toBe(true);
    const entry = await outbox.findByAnchor("refusal", "R1");
    expect(entry?.state).toBe("pending");
    expect(entry?.attempts).toBe(0);
  });

  it("marks a refusal failed (with backoff) on a batch-level rejection", async () => {
    const syncBatch = vi.fn().mockRejectedValue(new Error("422 unprocessable"));
    const { drainOutbox, outbox } = await setup({ syncBatch });

    await outbox.enqueue(refusalEntry("R1"));

    const summary = await drainOutbox();
    expect(summary.refusals.failed).toBe(1);
    const entry = await outbox.findByAnchor("refusal", "R1");
    expect(entry?.state).toBe("failed");
    expect(entry?.attempts).toBe(1);
    expect(entry?.next_attempt_at).toBeTruthy();
  });
});

describe("enqueueRefusal", () => {
  it("queues a refusal with a minted local_id, stamped occurred_at, and the given fields", async () => {
    const { enqueueRefusal, outbox } = await setup({ syncBatch: vi.fn() });

    const entry = await enqueueRefusal({
      menu_item_id: 88,
      reason: "OUT_OF_STOCK",
      requested_units: 3,
      available_units: 0,
    });

    expect(entry.kind).toBe("refusal");
    // The anchor IS the local_id — the server's dedup key.
    expect(entry.anchor).toBe(entry.body.local_id);
    expect(entry.body.local_id).toBeTruthy();
    expect(entry.body.occurred_at).toBeTruthy();
    expect(entry.body).toMatchObject({
      menu_item_id: 88,
      reason: "OUT_OF_STOCK",
      requested_units: 3,
      available_units: 0,
    });
    expect(await outbox.count()).toBe(1);
  });

  it("is idempotent on the anchor — a replayed local_id can't fork into two", async () => {
    const { outbox } = await setup({ syncBatch: vi.fn() });

    await outbox.enqueue(refusalEntry("R1"));
    await outbox.enqueue(refusalEntry("R1"));

    expect(await outbox.count()).toBe(1);
  });
});
