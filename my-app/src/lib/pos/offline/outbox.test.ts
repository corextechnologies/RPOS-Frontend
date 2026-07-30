/**
 * The outbox is where an offline sale physically lives between "charged the
 * customer" and "the server knows". Its correctness is money, so the guarantees
 * are tested against a real IndexedDB (`fake-indexeddb`), not a mock:
 *
 * - a queued action survives (round-trips through the store),
 * - the same business anchor never queues twice (no double sale),
 * - entries drain FIFO,
 * - a failure schedules a backoff and isn't retried before it,
 * - and none of it throws when IndexedDB is absent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  NewOutboxEntry,
  OrderOutboxBody,
  OutboxStore,
  PaymentOutboxBody,
} from "./outbox";
import type { PosOrderCreate } from "@/lib/types/pos";

function orderBody(localId: string): OrderOutboxBody {
  const order: PosOrderCreate = {
    local_id: localId,
    lines: [{ menu_item_id: 1, quantity: 2 }],
    channel: "COUNTER",
    order_type: "TAKEAWAY",
  };
  return { order, device_total_minor: 45000, was_sent: true };
}

function paymentBody(orderLocalId: string, clientPaymentId: string): PaymentOutboxBody {
  return {
    order_local_id: orderLocalId,
    payment: { method: "CASH", amount_minor: 45000, client_payment_id: clientPaymentId },
  };
}

const orderEntry = (localId: string): NewOutboxEntry => ({
  kind: "order",
  anchor: localId,
  body: orderBody(localId),
});

describe("outbox with IndexedDB present", () => {
  let store: OutboxStore;

  beforeEach(async () => {
    const { IDBFactory } = await import("fake-indexeddb");
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.resetModules();
    store = (await import("./outbox")).idbOutbox;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists an enqueued entry and reads it back", async () => {
    const entry = await store.enqueue(orderEntry("local-1"));
    expect(entry.state).toBe("pending");
    expect(entry.anchor).toBe("local-1");

    const found = await store.findByAnchor("order", "local-1");
    expect(found?.id).toBe(entry.id);
    expect(found?.body.order.local_id).toBe("local-1");
  });

  it("dedupes on the business anchor — one order never queues twice", async () => {
    const first = await store.enqueue(orderEntry("local-dup"));
    const second = await store.enqueue(orderEntry("local-dup"));
    expect(second.id).toBe(first.id);
    expect(await store.count()).toBe(1);
  });

  it("keeps distinct anchors separate", async () => {
    await store.enqueue(orderEntry("local-a"));
    await store.enqueue(orderEntry("local-b"));
    expect(await store.count()).toBe(2);
  });

  it("returns a kind's entries FIFO", async () => {
    await store.enqueue(orderEntry("local-1"));
    await store.enqueue(orderEntry("local-2"));
    await store.enqueue(orderEntry("local-3"));

    const orders = await store.byKind("order");
    expect(orders.map((e) => e.anchor)).toEqual(["local-1", "local-2", "local-3"]);
  });

  it("separates kinds — payments don't show up under orders", async () => {
    await store.enqueue(orderEntry("local-1"));
    await store.enqueue({
      kind: "payment",
      anchor: "pay-1",
      body: paymentBody("local-1", "pay-1"),
    });

    expect((await store.byKind("order")).map((e) => e.anchor)).toEqual(["local-1"]);
    expect((await store.byKind("payment")).map((e) => e.anchor)).toEqual(["pay-1"]);
    expect(await store.count()).toBe(2);
  });

  it("markFailed bumps attempts, records the error, and schedules a backoff", async () => {
    const { isDue } = await import("./outbox");
    const entry = await store.enqueue(orderEntry("local-fail"));
    expect(isDue(entry)).toBe(true);

    await store.markFailed(entry.id, "ECONNREFUSED");

    const after = await store.findByAnchor("order", "local-fail");
    expect(after?.state).toBe("failed");
    expect(after?.attempts).toBe(1);
    expect(after?.last_error).toBe("ECONNREFUSED");
    // Not due immediately (backoff in the future); due once it elapses.
    expect(isDue(after!)).toBe(false);
    expect(isDue(after!, Date.now() + 10 * 60_000)).toBe(true);
  });

  it("in_flight entries are never due to a concurrent drain pass", async () => {
    const { isDue } = await import("./outbox");
    const entry = await store.enqueue(orderEntry("local-flight"));
    await store.markInFlight(entry.id);
    const after = await store.findByAnchor("order", "local-flight");
    expect(after?.state).toBe("in_flight");
    expect(isDue(after!)).toBe(false);
  });

  it("remove drops a settled entry", async () => {
    const entry = await store.enqueue(orderEntry("local-gone"));
    await store.remove(entry.id);
    expect(await store.findByAnchor("order", "local-gone")).toBeNull();
    expect(await store.count()).toBe(0);
  });

  it("backoff grows with attempts and caps", async () => {
    const { backoffMs } = await import("./outbox");
    expect(backoffMs(1)).toBe(5_000);
    expect(backoffMs(2)).toBe(10_000);
    expect(backoffMs(3)).toBe(20_000);
    expect(backoffMs(50)).toBe(5 * 60_000); // capped
  });
});

describe("outbox without IndexedDB (graceful degradation)", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", undefined);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not throw; count is zero and lookups miss cleanly", async () => {
    const store = (await import("./outbox")).idbOutbox;
    // enqueue still returns a well-formed entry (the caller can proceed), it
    // just isn't persisted where there's no store.
    const entry = await store.enqueue(orderEntry("local-x"));
    expect(entry.anchor).toBe("local-x");
    expect(await store.count()).toBe(0);
    expect(await store.findByAnchor("order", "local-x")).toBeNull();
    await expect(store.remove(entry.id)).resolves.toBeUndefined();
  });
});
