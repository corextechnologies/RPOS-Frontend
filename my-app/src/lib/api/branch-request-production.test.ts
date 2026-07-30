import { beforeAll, describe, expect, it } from "vitest";

/**
 * The kitchen produces a branch request line by line before it can advance to
 * PRODUCED. This pins the server-side contract the UI leans on:
 *
 * - marking a line is only legal while IN_PRODUCTION (invalid_transition otherwise),
 * - it is idempotent (re-marking a produced line is a safe no-op),
 * - PRODUCED is gated until every non-exempt line is produced (lines_not_all_produced),
 * - the mark-line endpoint is branch-only (invalid_request_type on other types).
 *
 * The mock backend reads `window`/`localStorage`; the suite runs under `node`,
 * so both are stubbed before the module is imported.
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

beforeAll(async () => {
  installBrowserGlobals();
  ({ mockClient } = await import("./mock"));
});

describe("branch request in-house production", () => {
  it("gates PRODUCED on every line and marking a line is idempotent", async () => {
    // req-010 is a seeded BRANCH_TO_ADMIN request forwarded to kit-001 with two
    // approved lines, li-012 and li-013.
    await mockClient.login("kitchen@demo.ros", "Demo@1234");

    // A line can't be marked before production starts.
    await expect(
      mockClient.markKitchenRequestLineProduced("req-010", "li-012"),
    ).rejects.toMatchObject({ code: "invalid_transition" });

    await mockClient.updateKitchenRequestStatus("req-010", { to_status: "IN_PRODUCTION" });

    // Nothing produced yet → PRODUCED is refused, and names the outstanding lines.
    await expect(
      mockClient.updateKitchenRequestStatus("req-010", { to_status: "PRODUCED" }),
    ).rejects.toMatchObject({
      code: "lines_not_all_produced",
      details: { unproduced_line_ids: ["li-012", "li-013"] },
    });

    // Mark the first line; re-marking it is a safe no-op (idempotent tick).
    let req = await mockClient.markKitchenRequestLineProduced("req-010", "li-012");
    expect(req.line_items.find((l) => l.id === "li-012")?.produced).toBe(true);
    req = await mockClient.markKitchenRequestLineProduced("req-010", "li-012");
    expect(req.line_items.find((l) => l.id === "li-012")?.produced).toBe(true);

    // One line still outstanding → still gated.
    await expect(
      mockClient.updateKitchenRequestStatus("req-010", { to_status: "PRODUCED" }),
    ).rejects.toMatchObject({ code: "lines_not_all_produced" });

    // Produce the last line → PRODUCED now succeeds.
    await mockClient.markKitchenRequestLineProduced("req-010", "li-013");
    const done = await mockClient.updateKitchenRequestStatus("req-010", {
      to_status: "PRODUCED",
    });
    expect(done.status).toBe("PRODUCED");
  });

  it("rejects the mark-line endpoint on a non-branch request", async () => {
    // req-008 is a seeded KITCHEN_TO_WAREHOUSE request — the branch-only endpoint
    // must refuse it before it ever looks at the line.
    await mockClient.login("kitchen@demo.ros", "Demo@1234");
    await expect(
      mockClient.markKitchenRequestLineProduced("req-008", "li-any"),
    ).rejects.toMatchObject({ code: "invalid_request_type" });
  });
});
