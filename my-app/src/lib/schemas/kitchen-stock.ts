import { z } from "zod";
import { wasteReasonSchema } from "@/lib/stock/waste-reason";

/**
 * Quantities arrive from number inputs as strings, so they are validated as
 * strings and converted at the call site. Mirrors the warehouse stock schemas.
 */
const wholeQuantity = z.string().refine((value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}, "Enter a whole quantity greater than 0");

/**
 * Required here, optional on the Warehouse's endpoint — but both portals send
 * it, and both use the same shared list. See lib/stock/waste-reason.ts.
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

// Labels and the reason enum now live in lib/stock/waste-reason.ts, shared with
// the Warehouse. Re-exported so existing kitchen imports keep working.
export {
  MOVEMENT_TYPE_LABELS,
  WASTE_REASON_LABELS,
  wasteReasonSchema,
} from "@/lib/stock/waste-reason";
