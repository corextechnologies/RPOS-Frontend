import { describe, expect, it } from "vitest";
import {
  isApiCode,
  isDeviceFault,
  needsManagerApproval,
  needsRepairing,
  posErrorMessage,
  readInsufficientStock,
  insufficientStockMessage,
  stockAwareMessage,
  readDueMinor,
  readLimitBp,
  readPriceMismatch,
} from "./errors";
import { ApiError } from "@/lib/types/super-admin";
import { parseApiError } from "./envelope";

describe("parseApiError carries details through", () => {
  /**
   * The regression that matters: `parseApiError` used to READ `error.details`
   * and drop it, because ApiError had nowhere to put it. That made the POS's
   * mandated "409 with the server's breakdown" impossible to render.
   */
  it("no longer drops error.details on the floor", () => {
    const err = parseApiError(
      { error: { code: "price_mismatch", message: "Prices moved", details: { total_minor: 999 } } },
      409,
    );
    expect(err.code).toBe("price_mismatch");
    expect(err.status).toBe(409);
    expect(err.details).toEqual({ total_minor: 999 });
  });

  it("still behaves identically when details is absent", () => {
    const err = parseApiError({ error: { code: "nope", message: "No" } }, 400);
    expect(err.details).toBeUndefined();
    expect(err.message).toBe("No");
  });

  it("falls back through the envelope shapes", () => {
    expect(parseApiError({ detail: "FastAPI style" }, 422).message).toBe("FastAPI style");
    expect(parseApiError({}, 500).message).toBe("Request failed");
  });
});

describe("isApiCode", () => {
  it("matches on code, which is the stable thing", () => {
    const err = new ApiError("whatever", 409, "price_mismatch");
    expect(isApiCode(err, "price_mismatch")).toBe(true);
    expect(isApiCode(err, "overpayment", "price_mismatch")).toBe(true);
    expect(isApiCode(err, "overpayment")).toBe(false);
  });

  it("is safe on non-errors", () => {
    expect(isApiCode(null, "price_mismatch")).toBe(false);
    expect(isApiCode(new Error("plain"), "price_mismatch")).toBe(false);
  });
});

describe("readPriceMismatch", () => {
  it("reads the POS shape (minor units, total)", () => {
    const err = new ApiError("mismatch", 409, "price_mismatch", {
      expected_total_minor: 100000,
      server_total_minor: 110000,
    });
    const d = readPriceMismatch(err);
    expect(d.proposedTotalMinor).toBe(100000);
    expect(d.serverTotalMinor).toBe(110000);
  });

  it("reads the branch shape (per-line decimal strings)", () => {
    const err = new ApiError("mismatch", 409, "price_mismatch", {
      lines: [
        { product_name: "Burger", proposed_unit_price: "1.00", server_unit_price: "10.00" },
        { product_id: 7, proposed_unit_price: "2.00", server_unit_price: "3.00" },
      ],
    });
    const d = readPriceMismatch(err);
    expect(d.lines).toHaveLength(2);
    expect(d.lines[0]).toEqual({ label: "Burger", proposed: "1.00", server: "10.00" });
    expect(d.lines[1].label).toBe("Product #7");
  });

  it("labels a POS line by menu_item_id when unnamed", () => {
    const err = new ApiError("m", 409, "price_mismatch", {
      lines: [{ menu_item_id: 10, server_unit_price_minor: 50000 }],
    });
    expect(readPriceMismatch(err).lines[0].label).toBe("Item #10");
  });

  /**
   * The guide documents `details` per code but not always its exact keys. A
   * mismatch dialog that throws because a key was spelled differently is worse
   * than one that degrades — and it throws inside an error handler, which is
   * the worst possible place.
   */
  it("degrades instead of throwing on shapes it doesn't recognise", () => {
    for (const details of [undefined, null, "a string", 42, [], { lines: "not an array" }]) {
      const d = readPriceMismatch(new ApiError("m", 409, "price_mismatch", details));
      expect(d.lines).toEqual([]);
      expect(d.serverTotalMinor).toBeNull();
    }
  });

  it("skips junk entries but keeps the good ones", () => {
    const err = new ApiError("m", 409, "price_mismatch", {
      lines: [null, { product_name: "Fries", server_unit_price: "5.00" }, "junk"],
    });
    const d = readPriceMismatch(err);
    expect(d.lines).toHaveLength(1);
    expect(d.lines[0].label).toBe("Fries");
    expect(d.lines[0].proposed).toBeNull();
  });

  it("ignores a non-integer total rather than trusting it", () => {
    const err = new ApiError("m", 409, "price_mismatch", { server_total_minor: 1.5 });
    expect(readPriceMismatch(err).serverTotalMinor).toBeNull();
  });
});

describe("approval and device faults", () => {
  it("reads the overpayment due amount", () => {
    expect(readDueMinor(new ApiError("o", 409, "overpayment", { due_minor: 5000 }))).toBe(5000);
    expect(readDueMinor(new ApiError("o", 409, "overpayment", {}))).toBeNull();
  });

  it("reads the discount limit", () => {
    expect(
      readLimitBp(new ApiError("d", 403, "discount_needs_approval", { limit_bp: 1000 })),
    ).toBe(1000);
  });

  it("routes approval codes to the manager prompt, not an error toast", () => {
    expect(needsManagerApproval(new ApiError("", 403, "discount_needs_approval"))).toBe(true);
    expect(needsManagerApproval(new ApiError("", 403, "variance_needs_approval"))).toBe(true);
    expect(needsManagerApproval(new ApiError("", 409, "overpayment"))).toBe(false);
  });

  it("identifies faults where retrying cannot possibly help", () => {
    expect(isDeviceFault(new ApiError("", 403, "device_not_bound"))).toBe(true);
    expect(isDeviceFault(new ApiError("", 403, "unknown_device"))).toBe(true);
    expect(isDeviceFault(new ApiError("", 403, "device_branch_mismatch"))).toBe(true);
    // A revoked terminal's session dies mid-service — its token is unusable too.
    expect(isDeviceFault(new ApiError("", 403, "device_revoked"))).toBe(true);
    // Not a device fault — the device is fine, it just has no drawer.
    expect(isDeviceFault(new ApiError("", 403, "device_cannot_take_cash"))).toBe(false);
  });

  it("routes re-pairable faults to the activation screen", () => {
    expect(needsRepairing(new ApiError("", 403, "unknown_device"))).toBe(true);
    expect(needsRepairing(new ApiError("", 403, "device_revoked"))).toBe(true);
    expect(needsRepairing(new ApiError("", 401, "device_uid_missing"))).toBe(true);
    // Wrong account on a fine terminal — re-pairing wouldn't fix it.
    expect(needsRepairing(new ApiError("", 403, "device_branch_mismatch"))).toBe(false);
    // A missing drawer isn't a pairing problem.
    expect(needsRepairing(new ApiError("", 403, "device_cannot_take_cash"))).toBe(false);
  });
});

describe("posErrorMessage", () => {
  it("humanises the codes a cashier will actually hit", () => {
    expect(posErrorMessage(new ApiError("x", 409, "item_unavailable"))).toContain("out of stock");
    expect(posErrorMessage(new ApiError("x", 409, "tender_required"))).toContain("handed over");
    expect(posErrorMessage(new ApiError("x", 403, "device_cannot_take_cash"))).toContain(
      "no cash drawer",
    );
  });

  it("falls back to the server's message for anything unmapped", () => {
    expect(posErrorMessage(new ApiError("Server said this", 400, "something_new"))).toBe(
      "Server said this",
    );
  });

  it("handles non-ApiErrors without exploding", () => {
    expect(posErrorMessage(new Error("boom"))).toBe("boom");
    expect(posErrorMessage("not an error")).toBe("Something went wrong");
  });
});

describe("insufficient_stock — the batch rule", () => {
  const withBatch = new ApiError("Insufficient stock.", 409, "insufficient_stock", {
    product_id: 42,
    product_name: "Cheese",
    location_type: "KITCHEN",
    location_id: 3,
    requested: 5,
    available: 2,
    batch_code: "B-CH-26",
  });
  const noBatch = new ApiError("Insufficient stock.", 409, "insufficient_stock", {
    product_id: 42,
    product_name: "Cheese",
    location_type: "WAREHOUSE",
    location_id: 3,
    requested: 5,
    available: 2,
  });

  it("reads every field", () => {
    const d = readInsufficientStock(withBatch);
    expect(d).toEqual({
      productId: 42,
      productName: "Cheese",
      locationType: "KITCHEN",
      locationId: 3,
      requested: 5,
      available: 2,
      batchCode: "B-CH-26",
    });
  });

  it("batch ABSENT → product-wide copy", () => {
    expect(insufficientStockMessage(noBatch)).toBe(
      "Not enough Cheese — 2 available, 5 requested.",
    );
  });

  it("batch PRESENT → batch-scoped copy, and 'available' means the batch", () => {
    expect(insufficientStockMessage(withBatch)).toBe(
      "Only 2 of batch B-CH-26 on hand, 5 requested.",
    );
  });

  /**
   * The defensive fallback the backend explicitly asked us to keep: every known
   * raise site is enriched now, but a future one might not be.
   */
  it("falls back to the server message when details is absent", () => {
    const bare = new ApiError("Insufficient stock for this operation.", 409, "insufficient_stock");
    expect(insufficientStockMessage(bare)).toBe("Insufficient stock for this operation.");
  });

  it("falls back when the numbers are missing, even if a name is present", () => {
    const partial = new ApiError("Insufficient stock.", 409, "insufficient_stock", {
      product_name: "Cheese",
    });
    expect(insufficientStockMessage(partial)).toBe("Insufficient stock.");
  });

  it("degrades on a junk payload rather than throwing inside an error handler", () => {
    for (const details of [undefined, null, "nope", 7, []]) {
      const err = new ApiError("fallback msg", 409, "insufficient_stock", details);
      expect(() => insufficientStockMessage(err)).not.toThrow();
      expect(insufficientStockMessage(err)).toBe("fallback msg");
    }
  });

  describe("stockAwareMessage", () => {
    it("upgrades an insufficient_stock error", () => {
      expect(stockAwareMessage(noBatch, "Failed to write off stock")).toBe(
        "Not enough Cheese — 2 available, 5 requested.",
      );
    });

    it("keeps the server message for other ApiErrors", () => {
      const other = new ApiError("Batch not found", 404, "no_such_stock");
      expect(stockAwareMessage(other, "Failed to write off stock")).toBe("Batch not found");
    });

    it("uses the caller's fallback for non-errors", () => {
      expect(stockAwareMessage("weird", "Failed to write off stock")).toBe(
        "Failed to write off stock",
      );
    });

    it("routes through posErrorMessage too — every POS surface gets it free", () => {
      expect(posErrorMessage(withBatch)).toBe("Only 2 of batch B-CH-26 on hand, 5 requested.");
    });
  });
});
