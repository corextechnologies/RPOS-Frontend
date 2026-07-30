/**
 * Two guarantees this module lives or dies by:
 *
 * 1. **Round-trip.** What's cached online is exactly what's read back offline —
 *    otherwise the till sells from a corrupted menu.
 * 2. **Graceful absence.** Where IndexedDB doesn't exist (SSR, private mode), a
 *    write is a silent no-op and a read is a clean miss — never a throw. Offline
 *    is an enhancement; its absence must not take the till down.
 *
 * `fake-indexeddb/auto` registers a real, spec-compliant IndexedDB on `global`,
 * so the round-trip tests exercise the actual `db.ts` transaction paths rather
 * than a mock of them.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilityRow, PosBootstrap, PosMenu } from "@/lib/types/pos";

const bootstrap = {
  branch: { id: 1, code: "GLB", country_code: "PK", province_code: null, currency: "PKR", timezone: "Asia/Karachi" },
  device: { id: 7, code: "T1", profile: "COUNTER" },
  user: { id: 3, role: "BRANCH_STAFF", position: "ORDER_TAKER" },
  pack: { version: "pk@1", currency: "PKR", minor_units: 2, payment_methods: ["CASH", "ONLINE"], is_stub: false },
  capabilities: ["ORDER_CREATE", "PAYMENT_CASH"],
  server_time: "2026-07-30T12:00:00Z",
} as unknown as PosBootstrap;

const menu: PosMenu = {
  menu_version_id: 12,
  currency: "PKR",
  items: [
    {
      id: 1,
      name: "Burger",
      category: "Grill",
      price_minor: 45000,
      is_combo: false,
      is_available: true,
      unavailable_reason: null,
      components: [],
      modifier_groups: [],
    },
  ],
};

const availability: AvailabilityRow[] = [
  { menu_item_id: 1, is_available: false, reason: "Out of stock", on_hand: 0 },
];

describe("pos-cache with IndexedDB present", () => {
  beforeEach(async () => {
    // A brand-new IDBFactory per test (not the shared singleton) so no snapshot
    // leaks across cases, and a fresh module registry so db.ts's memoised
    // connection re-opens against it.
    const { IDBFactory } = await import("fake-indexeddb");
    vi.stubGlobal("indexedDB", new IDBFactory());
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips the bootstrap snapshot", async () => {
    const cache = await import("./pos-cache");
    await cache.cacheBootstrap(bootstrap);
    const read = await cache.readCachedBootstrap();
    expect(read?.data).toEqual(bootstrap);
    expect(read?.savedAt).toBeTypeOf("string");
  });

  it("round-trips the menu with its ETag", async () => {
    const cache = await import("./pos-cache");
    await cache.cacheMenu(menu, 'W/"menu-v12"');
    const read = await cache.readCachedMenu();
    expect(read?.data.menu).toEqual(menu);
    expect(read?.data.etag).toBe('W/"menu-v12"');
  });

  it("round-trips availability", async () => {
    const cache = await import("./pos-cache");
    await cache.cacheAvailability(availability);
    const read = await cache.readCachedAvailability();
    expect(read?.data).toEqual(availability);
  });

  it("returns null before anything is cached", async () => {
    const cache = await import("./pos-cache");
    expect(await cache.readCachedMenu()).toBeNull();
    expect(await cache.readCachedBootstrap()).toBeNull();
  });

  it("clearPosCache drops every snapshot", async () => {
    const cache = await import("./pos-cache");
    await cache.cacheBootstrap(bootstrap);
    await cache.cacheMenu(menu, null);
    await cache.cacheAvailability(availability);

    await cache.clearPosCache();

    expect(await cache.readCachedBootstrap()).toBeNull();
    expect(await cache.readCachedMenu()).toBeNull();
    expect(await cache.readCachedAvailability()).toBeNull();
  });
});

describe("pos-cache without IndexedDB (graceful degradation)", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", undefined);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes are silent no-ops and reads are clean misses", async () => {
    const cache = await import("./pos-cache");
    await expect(cache.cacheMenu(menu, null)).resolves.toBeUndefined();
    await expect(cache.readCachedMenu()).resolves.toBeNull();
    await expect(cache.readCachedBootstrap()).resolves.toBeNull();
    await expect(cache.clearPosCache()).resolves.toBeUndefined();
  });
});
