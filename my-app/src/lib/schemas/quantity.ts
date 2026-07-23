import { z } from "zod";

/**
 * Stock quantities used to be whole numbers everywhere ("no fractional stock").
 * That no longer holds: a recipe drawing 100 g of flour from stock kept in
 * kilograms leaves 0.7 kg behind, so quantities can be fractional. These shared
 * validators replace the per-schema `Number.isInteger` refinements so every
 * stock form relaxes in step, and there is one place to reason about the rule.
 *
 * Values arrive from number inputs as strings, so they validate as strings and
 * are converted (`Number(value)`) at the call site — the same convention the
 * stock schemas already followed.
 */

/** Positive, possibly fractional. Blank and non-numeric are rejected. */
export function positiveQtyString(
  message = "Enter a quantity greater than 0",
) {
  return z.string().refine((value) => {
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n) && n > 0;
  }, message);
}

/** Non-zero delta (adds when positive, removes when negative), possibly fractional. */
export function nonZeroQtyString(message = "Enter a number other than 0") {
  return z.string().refine((value) => {
    const n = Number(value);
    return value.trim() !== "" && Number.isFinite(n) && n !== 0;
  }, message);
}
