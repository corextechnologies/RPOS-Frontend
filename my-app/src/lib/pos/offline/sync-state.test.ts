import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FlaggedOrder } from "./sync-state";

function flag(over: Partial<FlaggedOrder> = {}): FlaggedOrder {
  return {
    local_id: "L1",
    order_id: 501,
    reason: "PRICE_DRIFT",
    server_total_minor: 46000,
    device_total_minor: 45000,
    flagged_at: "2026-07-30T12:00:00Z",
    ...over,
  };
}

describe("sync-state", () => {
  let state: typeof import("./sync-state");

  beforeEach(async () => {
    const { IDBFactory } = await import("fake-indexeddb");
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.resetModules();
    state = await import("./sync-state");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("order-id map", () => {
    it("remembers and looks up an order id", async () => {
      await state.rememberOrderId("L1", 900);
      expect(await state.lookupOrderId("L1")).toBe(900);
    });

    it("misses cleanly for an unknown local_id", async () => {
      expect(await state.lookupOrderId("nope")).toBeNull();
    });

    it("keeps multiple mappings", async () => {
      await state.rememberOrderId("L1", 900);
      await state.rememberOrderId("L2", 901);
      expect(await state.lookupOrderId("L1")).toBe(900);
      expect(await state.lookupOrderId("L2")).toBe(901);
    });
  });

  describe("flagged store", () => {
    it("records and reads a flag", async () => {
      await state.recordFlagged(flag());
      const list = await state.readFlagged();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ local_id: "L1", reason: "PRICE_DRIFT" });
    });

    it("keeps one row per local_id on re-record", async () => {
      await state.recordFlagged(flag({ server_total_minor: 46000 }));
      await state.recordFlagged(flag({ server_total_minor: 47000 }));
      const list = await state.readFlagged();
      expect(list).toHaveLength(1);
      expect(list[0].server_total_minor).toBe(47000);
    });

    it("dismisses one without touching the others", async () => {
      await state.recordFlagged(flag({ local_id: "L1" }));
      await state.recordFlagged(flag({ local_id: "L2" }));
      await state.dismissFlagged("L1");
      const list = await state.readFlagged();
      expect(list.map((f) => f.local_id)).toEqual(["L2"]);
    });

    it("notifies subscribers on record and dismiss", async () => {
      const fn = vi.fn();
      const unsub = state.subscribeFlagged(fn);
      await state.recordFlagged(flag());
      await state.dismissFlagged("L1");
      expect(fn).toHaveBeenCalledTimes(2);
      unsub();
      await state.recordFlagged(flag({ local_id: "L3" }));
      expect(fn).toHaveBeenCalledTimes(2); // no more after unsubscribe
    });
  });
});
