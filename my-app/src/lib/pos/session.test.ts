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

  it("clears both current and legacy device keys", () => {
    store.setItem("rpos-device-uid", "current-terminal");
    store.setItem("rpos-pos-device-uid", "legacy-terminal");

    posSession.clearDeviceUid();

    expect(store.getItem("rpos-device-uid")).toBeNull();
    expect(store.getItem("rpos-pos-device-uid")).toBeNull();
  });
});
