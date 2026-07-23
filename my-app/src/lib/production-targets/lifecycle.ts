/**
 * The production-target lifecycle, in one place.
 *
 * Both portals and the mock read the same ordering and labels from here so the
 * flow can't drift between where it is enforced (the API) and where it is drawn
 * (the stepper, the action cards). See `@/lib/types/production-target` for the
 * meaning of each status.
 */

import type {
  ProductionTargetLine,
  ProductionTargetStatus,
} from "@/lib/types/production-target";

/** The stages, in order. A target only ever moves forward through this list. */
export const PRODUCTION_TARGET_FLOW: readonly ProductionTargetStatus[] = [
  "PENDING",
  "ACKNOWLEDGED",
  "IN_PRODUCTION",
  "COMPLETED",
  "ALLOCATED",
  "DISPATCHED",
  "RECEIVED",
] as const;

/** Short labels for the stepper — kept punchy so the whole flow fits on a row. */
export const PRODUCTION_TARGET_STEP_LABEL: Record<ProductionTargetStatus, string> = {
  PENDING: "Sent",
  ACKNOWLEDGED: "Acknowledged",
  IN_PRODUCTION: "In production",
  COMPLETED: "Complete",
  ALLOCATED: "Allocated",
  DISPATCHED: "Dispatched",
  RECEIVED: "Received",
};

/** Zero-based position in the flow; -1 for an unknown status (never negative-indexes UI). */
export function productionTargetStep(status: ProductionTargetStatus): number {
  return PRODUCTION_TARGET_FLOW.indexOf(status);
}

/** True once the target has reached `status` (or moved past it). */
export function productionTargetReached(
  current: ProductionTargetStatus,
  status: ProductionTargetStatus,
): boolean {
  const c = productionTargetStep(current);
  const s = productionTargetStep(status);
  return c >= 0 && s >= 0 && c >= s;
}

/**
 * Finished goods are the lines the kitchen actually *makes*; resale lines are
 * held stock it adds for dispatch. The kitchen's In-production screen splits on
 * this so the two read differently ("Make" vs "Set aside").
 */
export function isMadeLine(line: Pick<ProductionTargetLine, "kind">): boolean {
  return line.kind === "FINISHED_GOOD";
}

/** Every line is ready — the gate for completing a target. */
export function allLinesProduced(lines: readonly ProductionTargetLine[]): boolean {
  return lines.length > 0 && lines.every((l) => l.produced);
}
