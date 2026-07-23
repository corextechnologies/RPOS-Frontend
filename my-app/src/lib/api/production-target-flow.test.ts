import { beforeEach, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/types/super-admin";

/**
 * The full production-target lifecycle, end to end through the mock.
 *
 * Admin → Kitchen → Branch, one target walked from PENDING all the way to
 * RECEIVED. This is a test of the CONTRACT the three portals are built against:
 * the server enforces the same rules independently and is the authority, but if
 * the two ever disagree this is what makes it visible before it ships.
 */

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, String(v));
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  get length() {
    return this.data.size;
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  value: { localStorage: storage, setTimeout, clearTimeout },
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });

const { mockClient: api } = await import("./mock");

const PASSWORD = "Demo@1234";
const ADMIN = "admin@demo-restaurant.ros";
const KITCHEN = "kitchen@demo.ros";
const BRANCH = "branch@demo.ros";

// The seeded PENDING target for the Central Kitchen: a made line (80 burgers)
// and a resale line (40 colas).
const TARGET = "ptgt-001";
const MADE_LINE = "ptgt-001-l1";
const RESALE_LINE = "ptgt-001-l2";
const BRANCH_ID = "br-001";

const as = (email: string) => api.login(email, PASSWORD);

beforeEach(() => {
  storage.clear();
});

// The mock simulates ~280ms of latency per call and this flow makes ~25 of
// them across three roles, so the default 5s ceiling is too tight.
describe("production target — full lifecycle", { timeout: 30_000 }, () => {
  it("walks a target from PENDING to RECEIVED across three portals", async () => {
    // --- Kitchen: acknowledge → start ---
    await as(KITCHEN);
    expect((await api.getKitchenProductionTarget(TARGET)).status).toBe("PENDING");

    let t = await api.acknowledgeProductionTarget(TARGET);
    expect(t.status).toBe("ACKNOWLEDGED");

    t = await api.startProductionTarget(TARGET);
    expect(t.status).toBe("IN_PRODUCTION");

    // Can't complete before every line is ready.
    await expect(api.completeProductionTarget(TARGET)).rejects.toBeInstanceOf(ApiError);

    // --- Kitchen: mark both lines ready, then complete ---
    await api.markProductionTargetLineProduced(TARGET, MADE_LINE);
    t = await api.markProductionTargetLineProduced(TARGET, RESALE_LINE);
    expect(t.lines.every((l) => l.produced)).toBe(true);

    t = await api.completeProductionTarget(TARGET);
    expect(t.status).toBe("COMPLETED");

    // --- Admin: allocate across branches ---
    await as(ADMIN);
    // Over-allocating a line is rejected.
    await expect(
      api.allocateProductionTarget(TARGET, {
        allocations: [{ line_id: MADE_LINE, branch_id: BRANCH_ID, quantity: 999 }],
      }),
    ).rejects.toBeInstanceOf(ApiError);

    t = await api.allocateProductionTarget(TARGET, {
      allocations: [
        { line_id: MADE_LINE, branch_id: BRANCH_ID, quantity: 80 },
        { line_id: RESALE_LINE, branch_id: BRANCH_ID, quantity: 40 },
      ],
    });
    expect(t.status).toBe("ALLOCATED");
    expect(t.allocations).toHaveLength(2);
    expect(t.allocations!.every((a) => a.status === "ALLOCATED")).toBe(true);

    // --- Kitchen: dispatch ---
    await as(KITCHEN);
    t = await api.dispatchProductionTarget(TARGET);
    expect(t.status).toBe("DISPATCHED");
    expect(t.allocations!.every((a) => a.status === "DISPATCHED")).toBe(true);

    // --- Branch: the dispatch shows up on Incoming, receive both ---
    await as(BRANCH);
    let deliveries = await api.listBranchDeliveries();
    const mine = deliveries.filter((d) => d.request_id === TARGET);
    expect(mine).toHaveLength(2);
    expect(mine.every((d) => d.status === "DISPATCHED")).toBe(true);

    for (const d of mine) {
      const received = await api.receiveBranchDelivery(d.id);
      expect(received.status).toBe("RECEIVED");
    }

    deliveries = await api.listBranchDeliveries();
    expect(
      deliveries.filter((d) => d.request_id === TARGET).every((d) => d.status === "RECEIVED"),
    ).toBe(true);

    // --- The target is now RECEIVED for everyone ---
    await as(KITCHEN);
    expect((await api.getKitchenProductionTarget(TARGET)).status).toBe("RECEIVED");
    await as(ADMIN);
    expect((await api.getProductionTarget(TARGET)).status).toBe("RECEIVED");
  });

  it("rejects out-of-order transitions", async () => {
    await as(KITCHEN);
    // Can't start before acknowledging.
    await expect(api.startProductionTarget(TARGET)).rejects.toBeInstanceOf(ApiError);
    // Can't dispatch before it's allocated.
    await api.acknowledgeProductionTarget(TARGET);
    await expect(api.dispatchProductionTarget(TARGET)).rejects.toBeInstanceOf(ApiError);
  });

  it("keeps the existing acknowledge step intact", async () => {
    await as(KITCHEN);
    const t = await api.acknowledgeProductionTarget(TARGET);
    expect(t.status).toBe("ACKNOWLEDGED");
    // The seeded COMPLETED target is untouched by the new flow.
    const list = await api.listKitchenProductionTargets();
    expect(list.find((x) => x.id === "ptgt-002")?.status).toBe("COMPLETED");
  });
});
