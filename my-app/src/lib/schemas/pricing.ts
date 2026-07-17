import { z } from "zod";
import type { UpdateProductPricingInput } from "@/lib/types/admin";

/**
 * Money is typed as a string here, not a number.
 *
 * `z.number()` on a money field means the value has already been through
 * `parseFloat` before validation ever runs, and the precision is gone by then.
 * The server speaks decimal strings; so does this form.
 */
const moneyString = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), {
    message: "Enter an amount like 250 or 250.00",
  });

export const updatePricingSchema = z.object({
  cost_price: moneyString,
  selling_price: moneyString,
  category: z.string().trim().max(100, "Category is too long"),
  is_available: z.boolean(),
});

export type UpdatePricingForm = z.infer<typeof updatePricingSchema>;

/**
 * Build the PATCH from the fields the user actually touched.
 *
 * This function is the whole reason the form isn't a one-liner. The endpoint
 * treats **absent as "leave alone" and `null` as "clear"**, while react-hook-form
 * hands you every registered field on submit. Posting `values` straight through
 * would send `category: null` on every save and quietly wipe the category off
 * any product whose category the user never even looked at.
 *
 * So: only dirty keys travel, and an emptied text field becomes an explicit
 * `null` — because that is a user clearing a value, which is exactly what null
 * means here.
 */
export function pricingPatch(
  values: UpdatePricingForm,
  dirty: Partial<Record<keyof UpdatePricingForm, boolean | undefined>>,
  /**
   * When false, the sell fields are dropped even if somehow marked dirty.
   *
   * The form doesn't render them for a raw material, so they can't normally be
   * touched — but "can't normally" isn't a guarantee, and the server answers
   * 409 `product_not_sellable` for a reason. Belt and braces on the one field
   * whose failure mode is pricing a sack of flour.
   */
  isSellable = true,
): UpdateProductPricingInput {
  const patch: UpdateProductPricingInput = {};

  if (dirty.cost_price) patch.cost_price = values.cost_price === "" ? null : values.cost_price;

  // Cost applies to everything — we buy raw materials, we just never sell them.
  if (!isSellable) return patch;

  if (dirty.selling_price) {
    patch.selling_price = values.selling_price === "" ? null : values.selling_price;
  }
  if (dirty.category) patch.category = values.category === "" ? null : values.category;
  if (dirty.is_available) patch.is_available = values.is_available;

  return patch;
}
