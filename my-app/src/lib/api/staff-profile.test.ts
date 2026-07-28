import { beforeEach, describe, expect, it } from "vitest";

/**
 * Staff & manager profiles — Phase 2.
 *
 * Two breaking changes worth locking down:
 *
 *  1. Every portal collects the same eight fields, and the five newer ones
 *     (photo, phone, address, both CNIC scans) must survive a create → list
 *     round trip. A field silently dropped in the mapping layer is invisible
 *     until someone opens the record.
 *  2. Warehouse staff no longer log in. They are personnel records, so the
 *     create response must carry no credentials, and a `WAREHOUSE_STAFF`
 *     login account must not be minted.
 *
 * This drives the mock, which is the CONTRACT the UI is built against; the
 * server enforces the same rules independently.
 */

// The mock reads `window.localStorage`; treat its absence as "server-side" and
// it hands back a SUPER_ADMIN, useless here. So: a real-enough store.
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

const { mockClient } = await import("./mock");

const PASSWORD = "Demo@1234";
const WAREHOUSE_MANAGER = "warehouse@demo.ros";
const KITCHEN_MANAGER = "kitchen@demo.ros";

/** The five fields Phase 2 added, shared by every portal. */
const PROFILE = {
  full_name: "Sara Khan",
  phone_number: "+92 300 1234567",
  address: "12 Mall Road, Lahore",
  image_url: "https://example.test/photo.webp",
  cnic_front_url: "https://example.test/cnic-front.webp",
  cnic_back_url: "https://example.test/cnic-back.webp",
};

beforeEach(() => {
  storage.clear();
});

describe("warehouse staff are personnel records, not accounts", () => {
  it("returns no credentials on create", async () => {
    await mockClient.login(WAREHOUSE_MANAGER, PASSWORD);
    const created = await mockClient.createWarehouseUser({
      ...PROFILE,
      email: "roster-one@test.ros",
      job_title: "Loader",
    });

    // The whole point of the change: nothing to hand over, so nothing is
    // returned. A credentials dialog here would be showing an empty promise.
    expect(created).not.toHaveProperty("credential_email_sent");
    expect(created).not.toHaveProperty("temporary_password");
  });

  it("does not mint a login — the new staff member cannot sign in", async () => {
    await mockClient.login(WAREHOUSE_MANAGER, PASSWORD);
    await mockClient.createWarehouseUser({
      ...PROFILE,
      email: "cannot-login@test.ros",
      job_title: "Loader",
    });
    await mockClient.logout();

    await expect(
      mockClient.login("cannot-login@test.ros", PASSWORD),
    ).rejects.toBeTruthy();
  });

  it("keeps all eight fields through a create → list round trip", async () => {
    await mockClient.login(WAREHOUSE_MANAGER, PASSWORD);
    await mockClient.createWarehouseUser({
      ...PROFILE,
      email: "full-record@test.ros",
      job_title: "Loader",
    });

    const page = await mockClient.listWarehouseUsers();
    const row = page.items.find((s) => s.email === "full-record@test.ros");

    expect(row).toBeDefined();
    expect(row).toMatchObject({
      full_name: PROFILE.full_name,
      job_title: "Loader",
      phone_number: PROFILE.phone_number,
      address: PROFILE.address,
      image_url: PROFILE.image_url,
      cnic_front_url: PROFILE.cnic_front_url,
      cnic_back_url: PROFILE.cnic_back_url,
    });
  });
});

describe("kitchen staff carry the same eight fields", () => {
  it("keeps them through a create → list round trip", async () => {
    await mockClient.login(KITCHEN_MANAGER, PASSWORD);
    await mockClient.createKitchenUser({
      ...PROFILE,
      email: "chef-record@test.ros",
      job_title: "Head Chef",
    });

    const page = await mockClient.listKitchenUsers();
    const row = page.items.find((s) => s.email === "chef-record@test.ros");

    expect(row).toBeDefined();
    expect(row).toMatchObject({
      full_name: PROFILE.full_name,
      job_title: "Head Chef",
      phone_number: PROFILE.phone_number,
      address: PROFILE.address,
      image_url: PROFILE.image_url,
      cnic_front_url: PROFILE.cnic_front_url,
      cnic_back_url: PROFILE.cnic_back_url,
    });
  });

  /** PATCH stays partial: an omitted field means "unchanged". */
  it("edits partially without clearing the untouched fields", async () => {
    await mockClient.login(KITCHEN_MANAGER, PASSWORD);
    const created = await mockClient.createKitchenUser({
      ...PROFILE,
      email: "partial-edit@test.ros",
      job_title: "Head Chef",
    });

    const updated = await mockClient.updateKitchenUser(created.user_id, {
      job_title: "Sous Chef",
    });

    expect(updated.job_title).toBe("Sous Chef");
    expect(updated.address).toBe(PROFILE.address);
    expect(updated.cnic_front_url).toBe(PROFILE.cnic_front_url);
  });
});

describe("staff document upload", () => {
  it("rejects a kind other than personal or cnic", async () => {
    await mockClient.login(KITCHEN_MANAGER, PASSWORD);
    const file = new File(["x"], "id.png", { type: "image/png" });

    await expect(
      // Deliberately bypassing the type to prove the runtime guard exists —
      // this is the `invalid_document_kind` a client bug would hit.
      mockClient.uploadStaffDocument(file, "passport" as "cnic"),
    ).rejects.toMatchObject({ code: "invalid_document_kind" });
  });
});
