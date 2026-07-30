/**
 * The drain is Headline #1's client half: unplug the network, sell, reconnect,
 * lose nothing. These tests run the real outbox (fake-indexeddb) against a
 * mocked `/pos` API, so they exercise the actual queue transitions — what
 * settles, what retries, what defers — not a paraphrase of them.
 *
 * Each test re-imports the modules after stubbing IndexedDB and the API, because
 * `drain.ts` binds `deviceServices.outbox` and `posApi` at module load.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewOutboxEntry } from "./outbox";
import type { PosOrderCreate, SyncBatchResult } from "@/lib/types/pos";

function orderEntry(localId: string): NewOutboxEntry {
  const order: PosOrderCreate = {
    local_id: localId,
    lines: [{ menu_item_id: 1, quantity: 1 }],
    channel: "COUNTER",
    order_type: "TAKEAWAY",
  };
  return {
    kind: "order",
    anchor: localId,
    body: { order, device_total_minor: 45000, was_sent: true },
  };
}

function paymentEntry(orderLocalId: string, clientPaymentId: string): NewOutboxEntry {
  return {
    kind: "payment",
    anchor: clientPaymentId,
    body: {
      order_local_id: orderLocalId,
      payment: { method: "CASH", amount_minor: 45000, client_payment_id: clientPaymentId },
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
  const syncState = await import("./sync-state");
  return { ...drain, outbox: idbOutbox, ...syncState };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock("@/lib/api/pos.api");
  vi.unstubAllGlobals();
});

describe("order stage", () => {
  it("settles an accepted order and removes it from the queue", async () => {
    const syncBatch = vi.fn().mockResolvedValue(
      batchResult({
        accepted: 1,
        results: [{ local_id: "L1", status: "accepted", order_id: 501, settled: true }],
      }),
    );
    const { drainOutbox, outbox, lookupOrderId } = await setup({ syncBatch });

    await outbox.enqueue(orderEntry("L1"));
    const summary = await drainOutbox();

    expect(syncBatch).toHaveBeenCalledOnce();
    expect(summary.orders.settled).toBe(1);
    expect(await outbox.count()).toBe(0);
    // The order id is remembered so a later payment can resolve it.
    expect(await lookupOrderId("L1")).toBe(501);
  });

  it("treats a duplicate as success", async () => {
    const syncBatch = vi.fn().mockResolvedValue(
      batchResult({
        duplicates: 1,
        results: [{ local_id: "L1", status: "duplicate", order_id: 501 }],
      }),
    );
    const { drainOutbox, outbox } = await setup({ syncBatch });
    await outbox.enqueue(orderEntry("L1"));

    await drainOutbox();
    expect(await outbox.count()).toBe(0);
  });

  it("records a flagged order for review but still clears it from the queue", async () => {
    const syncBatch = vi.fn().mockResolvedValue(
      batchResult({
        flagged: 1,
        results: [
          {
            local_id: "L1",
            status: "flagged",
            order_id: 501,
            flagged_reason: "PRICE_DRIFT",
            server_total_minor: 46000,
          },
        ],
      }),
    );
    const { drainOutbox, outbox, readFlagged } = await setup({ syncBatch });
    await outbox.enqueue(orderEntry("L1"));

    const summary = await drainOutbox();
    expect(summary.orders.flagged).toBe(1);
    expect(await outbox.count()).toBe(0);

    const flagged = await readFlagged();
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toMatchObject({
      local_id: "L1",
      reason: "PRICE_DRIFT",
      server_total_minor: 46000,
      device_total_minor: 45000,
    });
  });

  it("keeps a failed element queued for retry with backoff", async () => {
    const syncBatch = vi.fn().mockResolvedValue(
      batchResult({
        failed: 1,
        results: [{ local_id: "L1", status: "failed", error: "server boom" }],
      }),
    );
    const { drainOutbox, outbox } = await setup({ syncBatch });
    await outbox.enqueue(orderEntry("L1"));

    const summary = await drainOutbox();
    expect(summary.orders.failed).toBe(1);
    const entry = await outbox.findByAnchor("order", "L1");
    expect(entry?.state).toBe("failed");
    expect(entry?.attempts).toBe(1);
    expect(entry?.next_attempt_at).toBeTruthy();
  });

  it("aborts and requeues when the network is down mid-drain", async () => {
    const { PosNetworkError } = await import("@/lib/api/pos-client");
    const syncBatch = vi.fn().mockRejectedValue(new PosNetworkError("down"));
    const { drainOutbox, outbox } = await setup({ syncBatch });
    await outbox.enqueue(orderEntry("L1"));

    const summary = await drainOutbox();
    expect(summary.stoppedOffline).toBe(true);
    // Not failed — the network dropping must not penalise the entry with backoff.
    const entry = await outbox.findByAnchor("order", "L1");
    expect(entry?.state).toBe("pending");
    expect(entry?.attempts).toBe(0);
  });

  it("chunks more than 50 orders into separate batches", async () => {
    const syncBatch = vi.fn().mockImplementation(({ envelopes }: { envelopes: { order: { local_id: string } }[] }) =>
      Promise.resolve(
        batchResult({
          accepted: envelopes.length,
          results: envelopes.map((e) => ({
            local_id: e.order.local_id,
            status: "accepted" as const,
            order_id: 1,
          })),
        }),
      ),
    );
    const { drainOutbox, outbox } = await setup({ syncBatch });
    for (let i = 0; i < 51; i++) await outbox.enqueue(orderEntry(`L${i}`));

    await drainOutbox();
    expect(syncBatch).toHaveBeenCalledTimes(2);
    expect(syncBatch.mock.calls[0][0].envelopes).toHaveLength(50);
    expect(syncBatch.mock.calls[1][0].envelopes).toHaveLength(1);
    expect(await outbox.count()).toBe(0);
  });
});

describe("payment stage", () => {
  it("resolves the order id from the just-synced order and captures the payment", async () => {
    const syncBatch = vi.fn().mockResolvedValue(
      batchResult({
        accepted: 1,
        results: [{ local_id: "L1", status: "accepted", order_id: 900 }],
      }),
    );
    const pay = vi.fn().mockResolvedValue({ id: 1 });
    const { drainOutbox, outbox } = await setup({ syncBatch, pay });

    await outbox.enqueue(orderEntry("L1"));
    await outbox.enqueue(paymentEntry("L1", "P1"));

    const summary = await drainOutbox();
    expect(summary.payments.settled).toBe(1);
    expect(pay).toHaveBeenCalledOnce();
    expect(pay.mock.calls[0][0]).toBe(900); // order id, resolved from local_id
    expect(await outbox.count()).toBe(0);
  });

  it("defers a payment whose order hasn't synced yet, without failing it", async () => {
    const pay = vi.fn();
    // No order queued, nothing in the id map → the payment can't resolve.
    const { drainOutbox, outbox } = await setup({ syncBatch: vi.fn(), pay });
    await outbox.enqueue(paymentEntry("L-unknown", "P1"));

    const summary = await drainOutbox();
    expect(summary.payments.skipped).toBe(1);
    expect(pay).not.toHaveBeenCalled();
    const entry = await outbox.findByAnchor("payment", "P1");
    expect(entry?.state).toBe("pending"); // still queued, not failed
  });
});

describe("single-flight", () => {
  it("a second concurrent drain is a no-op", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const syncBatch = vi.fn().mockImplementation(async () => {
      await gate;
      return batchResult();
    });
    const { drainOutbox, outbox } = await setup({ syncBatch });
    await outbox.enqueue(orderEntry("L1"));

    const first = drainOutbox();
    const second = await drainOutbox(); // starts while first is awaiting the gate
    expect(second.ran).toBe(false);

    release();
    await first;
  });
});
