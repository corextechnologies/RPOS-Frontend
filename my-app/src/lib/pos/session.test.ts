import { beforeEach, describe, expect, it, vi } from "vitest";
import { posSession } from "./session";

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("posSession device uid", () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: store });
  });

  it("migrates the previous POS device key once", () => {
    store.setItem("rpos-pos-device-uid", "registered-terminal");

    expect(posSession.deviceUid).toBe("registered-terminal");
    expect(store.getItem("rpos-device-uid")).toBe("registered-terminal");
    expect(store.getItem("rpos-pos-device-uid")).toBeNull();
  });

  it("ignores a stored uid shorter than the server's 16-char floor", () => {
    // An older build persisted a 15-char dev uid; the server now 422s it.
    store.setItem("rpos-device-uid", "DEV-TERMINAL-01");
    expect(posSession.deviceUid).toBeNull();

    // ensureDeviceUid mints a fresh, long uid and overwrites the stale one.
    const minted = posSession.ensureDeviceUid();
    expect(minted.length).toBeGreaterThanOrEqual(16);
    expect(store.getItem("rpos-device-uid")).toBe(minted);
    expect(posSession.deviceUid).toBe(minted);
  });

  it("clears both current and legacy device keys", () => {
    store.setItem("rpos-device-uid", "current-terminal");
    store.setItem("rpos-pos-device-uid", "legacy-terminal");

    posSession.clearDeviceUid();

    expect(store.getItem("rpos-device-uid")).toBeNull();
    expect(store.getItem("rpos-pos-device-uid")).toBeNull();
  });
});

describe("posSession pairing", () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: store });
  });

  it("tracks the paired flag as a boolean hint", () => {
    expect(posSession.paired).toBe(false);
    posSession.setPaired(true);
    expect(posSession.paired).toBe(true);
    posSession.setPaired(false);
    expect(posSession.paired).toBe(false);
  });

  it("unpair drops the paired flag and session but keeps the device_uid", () => {
    store.setItem("rpos-device-uid", "till-uid");
    posSession.setPaired(true);
    posSession.setSession("tok", { device_id: 1, branch_id: 2 });

    posSession.unpair();

    // Re-pairing after a reissue reuses the same physical identity.
    expect(store.getItem("rpos-device-uid")).toBe("till-uid");
    expect(posSession.paired).toBe(false);
    expect(posSession.token).toBeNull();
    expect(posSession.context).toBeNull();
  });
});
