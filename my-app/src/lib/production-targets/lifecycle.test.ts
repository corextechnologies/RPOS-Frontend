import { describe, expect, it } from "vitest";
import {
  PRODUCTION_TARGET_FLOW,
  allLinesProduced,
  isMadeLine,
  productionTargetReached,
  productionTargetStep,
} from "./lifecycle";
import type { ProductionTargetLine } from "@/lib/types/production-target";

function line(over: Partial<ProductionTargetLine> = {}): ProductionTargetLine {
  return {
    id: "l1",
    product_id: "p1",
    product_name: "Burger",
    kind: "FINISHED_GOOD",
    produced: false,
    quantity: 10,
    ...over,
  };
}

describe("production-target lifecycle", () => {
  it("orders the seven stages", () => {
    expect(PRODUCTION_TARGET_FLOW).toEqual([
      "PENDING",
      "ACKNOWLEDGED",
      "IN_PRODUCTION",
      "COMPLETED",
      "ALLOCATED",
      "DISPATCHED",
      "RECEIVED",
    ]);
  });

  it("returns a step index, and -1 for an unknown status", () => {
    expect(productionTargetStep("PENDING")).toBe(0);
    expect(productionTargetStep("RECEIVED")).toBe(6);
    // @ts-expect-error — guarding the runtime fallback for an unmapped value.
    expect(productionTargetStep("NONSENSE")).toBe(-1);
  });

  it("knows whether a stage has been reached", () => {
    expect(productionTargetReached("DISPATCHED", "COMPLETED")).toBe(true);
    expect(productionTargetReached("COMPLETED", "COMPLETED")).toBe(true);
    expect(productionTargetReached("ACKNOWLEDGED", "IN_PRODUCTION")).toBe(false);
  });

  it("splits made items from resale items", () => {
    expect(isMadeLine(line({ kind: "FINISHED_GOOD" }))).toBe(true);
    expect(isMadeLine(line({ kind: "RESALE" }))).toBe(false);
  });

  it("gates completion on every line being ready", () => {
    expect(allLinesProduced([])).toBe(false);
    expect(allLinesProduced([line({ produced: true }), line({ produced: false })])).toBe(
      false,
    );
    expect(
      allLinesProduced([
        line({ id: "a", produced: true }),
        line({ id: "b", produced: true }),
      ]),
    ).toBe(true);
  });
});
