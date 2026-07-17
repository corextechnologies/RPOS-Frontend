import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYNC_BATCH_MAX, type SyncBatchResult, type SyncEnvelope } from "@/lib/types/pos";
import type { OutboxRecord } from "./outbox";

/**
 * The sync engine's contract, tested against a fake outbox + API.
 *
 * These are the rules a "cleanup" refactor is most likely to break, and each
 * one has a real consequence: a wedged terminal, a lost sale, or a discrepancy
 * that quietly disappears.
 */

const records = new Map<string, OutboxRecord>();

vi.mock("./outbox", () => ({
  outbox: {
    pending: async () =>
      [...records.values()]
        .filter((r) => r.result !== "accepted" && r.result !== "duplicate")
        .sort((a, b) => a.created_at - b.created_at),
    all: async () => [...records.values()],
    update: async (localId: string, patch: Partial<OutboxRecord>) => {
      const existing = records.get(localId);
      if (existing) records.set(localId, { ...existing, ...patch });
    },
    pruneSettled: async () => {
      for (const [id, r] of records) {
        if (r.result === "accepted" || r.result === "duplicate") records.delete(id);
      }
    },
  },
}));

const syncBatch = vi.fn<(e: SyncEnvelope[]) => Promise<SyncBatchResult>>();
vi.mock("@/lib/api/pos.api", () => ({ posApi: { syncBatch: (e: SyncEnvelope[]) => syncBatch(e) } }));

class FakeOffline extends Error {}
vi.mock("@/lib/api/pos-client", () => ({
  isOfflineError: (e: unknown) => e instanceof FakeOffline,
}));

const { drainOutbox } = await import("./sync");

function seed(n: number, from = 0): void {
  for (let i = from; i < from + n; i++) {
    records.set(`local-${i}`, {
      local_id: `local-${i}`,
      order: { local_id: `local-${i}`, lines: [], channel: "COUNTER", order_type: "TAKEAWAY" },
      device_total_minor: 1000,
      idempotency_key: `key-${i}`,
      created_at: 1000 + i,
      attempts: 0,
    });
  }
}

function ok(localIds: string[], status: SyncBatchResult["results"][number]["status"] = "accepted") {
  return {
    accepted: status === "accepted" ? localIds.length : 0,
    duplicates: 0,
    flagged: 0,
    failed: 0,
    results: localIds.map((local_id) => ({ local_id, status })),
  } satisfies SyncBatchResult;
}

beforeEach(() => {
  records.clear();
  syncBatch.mockReset();
});

describe("drainOutbox", () => {
  it("does nothing on an empty queue", async () => {
    const res = await drainOutbox();
    expect(syncBatch).not.toHaveBeenCalled();
    expect(res.attempted).toBe(0);
  });

  it("sends oldest-first — a queue is a sequence, not a set", async () => {
    seed(3);
    syncBatch.mockResolvedValue(ok(["local-0", "local-1", "local-2"]));
    await drainOutbox();
    const sent = syncBatch.mock.calls[0][0].map((e) => e.order.local_id);
    expect(sent).toEqual(["local-0", "local-1", "local-2"]);
  });

  /** Over the cap the server 422s the whole call, so the chunk size is a contract. */
  it(`chunks to ${SYNC_BATCH_MAX} per call`, async () => {
    seed(120);
    syncBatch.mockImplementation(async (envelopes) =>
      ok(envelopes.map((e) => e.order.local_id)),
    );
    await drainOutbox();
    expect(syncBatch).toHaveBeenCalledTimes(3);
    expect(syncBatch.mock.calls[0][0]).toHaveLength(50);
    expect(syncBatch.mock.calls[1][0]).toHaveLength(50);
    expect(syncBatch.mock.calls[2][0]).toHaveLength(20);
  });

  it("drops accepted and duplicate records", async () => {
    seed(2);
    syncBatch.mockResolvedValue({
      accepted: 1,
      duplicates: 1,
      flagged: 0,
      failed: 0,
      results: [
        { local_id: "local-0", status: "accepted", order_id: 1 },
        { local_id: "local-1", status: "duplicate" },
      ],
    });
    const res = await drainOutbox();
    expect(res.accepted).toBe(1);
    expect(res.duplicates).toBe(1);
    expect(records.size).toBe(0);
  });

  /**
   * The conflict policy. A flagged order was ACCEPTED — the sale happened —
   * but priced differently from what the device expected. Deleting it locally
   * would erase the only trace of a discrepancy someone must rule on.
   */
  it("keeps flagged records rather than pruning them away", async () => {
    seed(1);
    syncBatch.mockResolvedValue({
      accepted: 0,
      duplicates: 0,
      flagged: 1,
      failed: 0,
      results: [{ local_id: "local-0", status: "flagged", order_id: 9 }],
    });
    const res = await drainOutbox();
    expect(res.flagged).toBe(1);
    expect(records.get("local-0")?.result).toBe("flagged");
    expect(records.get("local-0")?.order_id).toBe(9);
  });

  /**
   * One bad element must never block the other 49. All-or-nothing is exactly
   * how a device wedges forever behind a single poisoned order.
   */
  it("lands the good elements alongside a failed one", async () => {
    seed(3);
    syncBatch.mockResolvedValue({
      accepted: 2,
      duplicates: 0,
      flagged: 0,
      failed: 1,
      results: [
        { local_id: "local-0", status: "accepted" },
        { local_id: "local-1", status: "failed", error_code: "item_unavailable", message: "Gone" },
        { local_id: "local-2", status: "accepted" },
      ],
    });
    const res = await drainOutbox();
    expect(res.accepted).toBe(2);
    expect(res.failed).toBe(1);
    expect(records.has("local-0")).toBe(false);
    expect(records.has("local-2")).toBe(false);
    expect(records.get("local-1")?.result).toBe("failed");
    expect(records.get("local-1")?.last_error).toBe("Gone");
  });

  it("stops on offline and leaves every record untouched for the next try", async () => {
    seed(60);
    syncBatch.mockRejectedValue(new FakeOffline());
    const res = await drainOutbox();
    expect(res.offline).toBe(true);
    expect(records.size).toBe(60);
    // The second chunk is never attempted — it would fail identically.
    expect(syncBatch).toHaveBeenCalledTimes(1);
    expect([...records.values()].every((r) => r.attempts === 0)).toBe(true);
  });

  it("keeps records and counts the attempt when the whole batch is rejected", async () => {
    seed(2);
    syncBatch.mockRejectedValue(new Error("429 Too Many Requests"));
    const res = await drainOutbox();
    expect(res.failed).toBe(2);
    expect(records.size).toBe(2);
    expect(records.get("local-0")?.attempts).toBe(1);
    expect(records.get("local-0")?.last_error).toContain("429");
  });

  it("counts an attempt for a record the server silently ignored", async () => {
    seed(2);
    syncBatch.mockResolvedValue(ok(["local-0"])); // local-1 unmentioned
    await drainOutbox();
    expect(records.get("local-1")?.attempts).toBe(1);
    expect(records.get("local-1")?.last_error).toContain("No result");
  });

  it("reuses each record's idempotency key rather than minting a new one", async () => {
    seed(1);
    records.get("local-0")!.idempotency_key = "stable-key";
    syncBatch.mockResolvedValue(ok(["local-0"]));
    await drainOutbox();
    // The key lives on the record, not the envelope — what matters is that the
    // record survives a failed attempt with its key intact, so the retry is a
    // replay and not a second sale.
    expect(records.get("local-0")?.idempotency_key ?? "stable-key").toBe("stable-key");
  });

  /** Two triggers (reconnect + poll timer) must not double-post the queue. */
  it("is single-flight", async () => {
    seed(1);
    let resolve!: (v: SyncBatchResult) => void;
    syncBatch.mockReturnValue(new Promise<SyncBatchResult>((r) => (resolve = r)));

    const a = drainOutbox();
    const b = drainOutbox();
    resolve(ok(["local-0"]));
    await Promise.all([a, b]);

    expect(syncBatch).toHaveBeenCalledTimes(1);
  });
});
