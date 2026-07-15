import { z } from "zod";

/**
 * Why stock was written off.
 *
 * Shared across the Warehouse and Kitchen on purpose — the exception to this
 * codebase's "each portal owns its DTOs" rule. That rule exists because the
 * portals genuinely disagree on the wire; here they do not. It is one enum,
 * server-side, on two endpoints, and the waste-rate analytics aggregates across
 * both. Two copies could drift apart and silently split the same report in two.
 *
 * The only difference is enforcement: the field is required on the kitchen's
 * endpoint and optional on the warehouse's. Both portals send it regardless —
 * a write-off logged without a reason can never be reported on afterwards.
 */
export const wasteReasonSchema = z.enum([
  "SPOILAGE",
  "EXPIRED",
  "DAMAGED",
  "OVERPRODUCTION",
  "PREP_ERROR",
  "OTHER",
]);

export type WasteReason = z.infer<typeof wasteReasonSchema>;

/** Display strings. Never render the raw wire values. */
export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  SPOILAGE: "Spoilage",
  EXPIRED: "Expired",
  DAMAGED: "Damaged",
  OVERPRODUCTION: "Overproduction",
  PREP_ERROR: "Prep error",
  OTHER: "Other",
};

export const MOVEMENT_TYPE_LABELS: Record<"WASTE" | "EXPIRY", string> = {
  WASTE: "Waste",
  EXPIRY: "Expiry",
};

/** Opening a write-off from a near-expiry list already says why. */
export function defaultReasonFor(movementType: "WASTE" | "EXPIRY"): WasteReason {
  return movementType === "EXPIRY" ? "EXPIRED" : "SPOILAGE";
}
