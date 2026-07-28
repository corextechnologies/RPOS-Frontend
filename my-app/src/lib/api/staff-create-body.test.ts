import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { branchApi } from "./branch.api";
import { kitchenApi } from "./kitchen.api";
import { warehouseApi } from "./warehouse.api";

/**
 * What each portal actually PUTS ON THE WIRE when creating staff.
 *
 * This exists because of a real bug: every portal hand-wrote its own create
 * body, and when the field set grew from three to eight, three of the four
 * mappings were left behind. The forms, types, schemas and mock were all
 * correct, so every existing test passed — and the server still answered 422,
 * because the HTTP layer silently dropped `address` and both CNIC urls.
 *
 * The mock-driven tests cannot catch that: they hand the whole object straight
 * to the mock and never serialise a request. So this one stubs `fetch` and
 * asserts the JSON body itself.
 */

const ALL_EIGHT = [
  "full_name",
  "email",
  "phone_number",
  "address",
  "image_url",
  "cnic_front_url",
  "cnic_back_url",
] as const;

const INPUT = {
  email: "sara@test.ros",
  full_name: "Sara Khan",
  phone_number: "+92 300 1234567",
  address: "12 Mall Road, Lahore",
  image_url: "https://example.test/photo.webp",
  cnic_front_url: "https://example.test/front.webp",
  cnic_back_url: "https://example.test/back.webp",
};

let sentBody: Record<string, unknown>;

beforeEach(() => {
  sentBody = {};
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body ?? "{}"));
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { user_id: 1, kitchen_id: 1, warehouse_id: 1 } }),
      } as unknown as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("create bodies carry every required field", () => {
  it("kitchen sends all eight plus job_title", async () => {
    await kitchenApi.createKitchenUser({ ...INPUT, job_title: "Head Chef" });

    for (const field of ALL_EIGHT) {
      expect(sentBody, `missing ${field}`).toHaveProperty(field);
    }
    expect(sentBody.job_title).toBe("Head Chef");
    expect(sentBody.address).toBe(INPUT.address);
    expect(sentBody.cnic_front_url).toBe(INPUT.cnic_front_url);
  });

  it("warehouse sends all eight plus job_title", async () => {
    await warehouseApi.createWarehouseUser({ ...INPUT, job_title: "Loader" });

    for (const field of ALL_EIGHT) {
      expect(sentBody, `missing ${field}`).toHaveProperty(field);
    }
    expect(sentBody.job_title).toBe("Loader");
  });

  it("branch sends all eight plus position", async () => {
    await branchApi.createBranchStaff({ ...INPUT, position: "CASHIER" });

    for (const field of ALL_EIGHT) {
      expect(sentBody, `missing ${field}`).toHaveProperty(field);
    }
    // Never free text — the till derives its capability list from this value.
    expect(sentBody.position).toBe("CASHIER");
  });
});
