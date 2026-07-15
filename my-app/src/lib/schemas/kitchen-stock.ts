import { z } from "zod";

/**
 * Quantities arrive from number inputs as strings, so they are validated as
 * strings and converted at the call site. Mirrors the warehouse stock schemas.
 */
const wholeQuantity = z.string().refine((value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}, "Enter a whole quantity greater than 0");

export const wasteReasonSchema = z.enum([
  "SPOILAGE",
  "EXPIRED",
  "DAMAGED",
  "OVERPRODUCTION",
  "PREP_ERROR",
  "OTHER",
]);

/**
 * Unlike the Warehouse's waste form, `waste_reason` is required — the API
 * rejects a write-off without one.
 */
export const kitchenWasteSchema = z.object({
  quantity: wholeQuantity,
  waste_reason: wasteReasonSchema,
  movement_type: z.enum(["WASTE", "EXPIRY"]),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
});

export type KitchenWasteForm = z.infer<typeof kitchenWasteSchema>;

export const kitchenWasteDefaults: KitchenWasteForm = {
  quantity: "",
  waste_reason: "SPOILAGE",
  movement_type: "WASTE",
  notes: "",
};

/** Display strings for the enums. Never render the raw wire values. */
export const WASTE_REASON_LABELS: Record<
  z.infer<typeof wasteReasonSchema>,
  string
> = {
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
