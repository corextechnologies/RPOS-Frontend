import { beforeAll, describe, expect, it } from "vitest";

/**
 * The sub-kitchen prep board — ticket lifecycle and the stock move on complete.
 * Pins the contract the board UI leans on:
 *
 * - the working board returns only open tickets,
 * - status moves follow the prep transition map (COMPLETED can't be set here),
 * - completing consumes branch stock and, for a BATCH job, credits the finished
 *   item back; insufficient stock is all-or-nothing and safe to retry.
 *
 * The mock reads `window`/`localStorage`; the suite runs under `node`, so both
 * are stubbed before the module is imported.
 */

function installBrowserGlobals() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  Object.assign(globalThis, { window: {}, localStorage });
}

type MockClient = typeof import("./mock")["mockClient"];
let mockClient: MockClient;

const onHand = (rows: { product_id: string; quantity: number }[], id: string) =>
  rows.filter((r) => r.product_id === id).reduce((s, r) => s + r.quantity, 0);

beforeAll(async () => {
  installBrowserGlobals();
  ({ mockClient } = await import("./mock"));
  await mockClient.login("branch@demo.ros", "Demo@1234");
});

describe("sub-kitchen prep board", () => {
  it("works a batch ticket to completion, moving branch stock", async () => {
    // Seeded board: prep-001 (QUEUED, 8× Classic Burger) + prep-002 (IN_PROGRESS).
    const board = await mockClient.listPrepBoard();
    expect(board.items.map((t) => t.id)).toEqual(
      expect.arrayContaining(["prep-001", "prep-002"]),
    );
    // Highest priority first — prep-001 has priority 1.
    expect(board.items[0].id).toBe("prep-001");

    // A new batch job lands QUEUED.
    const created = await mockClient.createBatchJob({ product_id: 6, quantity: 5 });
    expect(created.status).toBe("QUEUED");
    expect(created.source).toBe("BATCH");

    // QUEUED → IN_PROGRESS → READY.
    await mockClient.updatePrepStatus("prep-001", { status: "IN_PROGRESS" });
    const ready = await mockClient.updatePrepStatus("prep-001", { status: "READY" });
    expect(ready.status).toBe("READY");

    // COMPLETED is not settable via /status.
    await expect(
      mockClient.updatePrepStatus("prep-001", {
        status: "COMPLETED" as never,
      }),
    ).rejects.toMatchObject({ code: "use_complete_endpoint" });

    const before = await mockClient.listBranchInventory();
    const mozBefore = onHand(before, "prod-003"); // Mozzarella, seeded at 9
    const burgerBefore = onHand(before, "prod-006"); // none yet

    // Complete with hand-stated inputs → consumes 2 Mozzarella, credits 8 Burgers.
    const done = await mockClient.completePrepTicket("prep-001", {
      inputs: [{ product_id: 3, quantity: 2 }],
    });
    expect(done.status).toBe("COMPLETED");

    const after = await mockClient.listBranchInventory();
    expect(onHand(after, "prod-003")).toBe(mozBefore - 2);
    expect(onHand(after, "prod-006")).toBe(burgerBefore + 8);

    // A completed ticket drops off the working board.
    const openBoard = await mockClient.listPrepBoard();
    expect(openBoard.items.map((t) => t.id)).not.toContain("prep-001");
  });

  it("rejects illegal moves, empty completions, and shortfalls", async () => {
    // prep-002 is IN_PROGRESS; QUEUED is not a legal next step.
    await expect(
      mockClient.updatePrepStatus("prep-002", { status: "QUEUED" as never }),
    ).rejects.toMatchObject({ code: "invalid_prep_transition" });

    // No recipe and no inputs → nothing to consume.
    await expect(
      mockClient.completePrepTicket("prep-002", {}),
    ).rejects.toMatchObject({ code: "no_active_recipe" });

    // Asking for more than on-hand fails all-or-nothing.
    await expect(
      mockClient.completePrepTicket("prep-002", {
        inputs: [{ product_id: 3, quantity: 9999 }],
      }),
    ).rejects.toMatchObject({ code: "insufficient_stock" });

    // Cancel closes it; cancelling again is rejected.
    const cancelled = await mockClient.cancelPrepTicket("prep-002");
    expect(cancelled.status).toBe("CANCELLED");
    await expect(mockClient.cancelPrepTicket("prep-002")).rejects.toMatchObject({
      code: "prep_not_open",
    });
  });
});
