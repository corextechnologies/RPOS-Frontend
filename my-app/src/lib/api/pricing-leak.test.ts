import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * `cost_price` is Admin-only and must be **structurally absent** from every
 * branch- and POS-facing shape — not nulled, not omitted by a mapper, and
 * certainly not hidden with CSS. The frontend plan of record says so
 * ("Price must be structurally absent from this view's data/component"), the
 * backend guards the same property with its own recursive scan, and this repo
 * already states the convention in `types/admin.ts`.
 *
 * This is the cheap half of that guarantee: if `cost_price` cannot be named in
 * the branch/POS type surface, no component can render it. The other half — a
 * runtime scan of real response bodies — belongs in an integration test against
 * the live API, and is noted in the plan rather than faked here.
 */

const SRC = path.resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(path.join(SRC, rel), "utf8");
}

/** Strip comments so the word `cost_price` in prose doesn't fail the test. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("cost_price does not leak below Admin", () => {
  const forbidden = ["lib/types/branch.ts", "lib/types/pos.ts"];

  for (const rel of forbidden) {
    it(`${rel} cannot name cost_price`, () => {
      expect(code(read(rel))).not.toContain("cost_price");
    });
  }

  /**
   * The positive control. If Admin's own type stopped carrying `cost_price`,
   * the tests above would pass for the wrong reason — the field would simply
   * have been renamed and this guard would be asleep.
   */
  it("Admin's type still carries it, so the guard is testing something", () => {
    expect(code(read("lib/types/admin.ts"))).toContain("cost_price");
  });
});
