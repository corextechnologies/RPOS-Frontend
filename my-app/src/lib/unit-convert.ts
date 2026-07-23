import {
  STOCK_UNITS,
  UNIT_BASE_FACTOR,
  UNIT_DIMENSION,
  isConvertibleDimension,
  stockUnitColumnLabel,
  type StockUnit,
} from "@/lib/stock-unit";

/**
 * Conversion between stock units of the same dimension.
 *
 * The one place this matters is recipe → inventory: a recipe expressed in grams
 * has to draw down flour stocked in kilograms. Everything else in the app stays
 * in a product's own `stock_unit` and never needs this.
 *
 * Rules (see `UNIT_DIMENSION` / `UNIT_BASE_FACTOR` in stock-unit.ts):
 *  - A unit always converts to itself (factor 1), whatever its dimension.
 *  - MASS (kg/g) and VOLUME (L/ml) convert freely within their dimension.
 *  - Every other dimension (count, portion, small-measure, produce) has no
 *    universal factor, so a conversion there is only legal to the same unit.
 * Results may be fractional (0.7 kg) — callers must be ready for decimals.
 */

/** True when `from` can be converted to `to` without ambiguity. */
export function canConvertUnit(from: StockUnit, to: StockUnit): boolean {
  if (from === to) return true;
  const dimension = UNIT_DIMENSION[from];
  return dimension === UNIT_DIMENSION[to] && isConvertibleDimension(dimension);
}

/**
 * Convert `qty` from one unit to another, returning the converted amount.
 *
 * Throws when the units are not convertible (different dimensions, or the same
 * non-convertible dimension) — an illegal conversion is a programming error, not
 * a value to paper over. Use {@link tryConvertQty} where a miss is expected.
 */
export function convertQty(
  qty: number,
  from: StockUnit,
  to: StockUnit,
): number {
  if (from === to) return qty;
  if (!canConvertUnit(from, to)) {
    throw new Error(
      `Cannot convert ${stockUnitColumnLabel(from)} to ${stockUnitColumnLabel(to)}: incompatible units`,
    );
  }
  // Both are in UNIT_BASE_FACTOR because canConvertUnit passed for a convertible
  // dimension; the `?? 1` only satisfies the type of the partial record.
  const fromFactor = UNIT_BASE_FACTOR[from] ?? 1;
  const toFactor = UNIT_BASE_FACTOR[to] ?? 1;
  return (qty * fromFactor) / toFactor;
}

/**
 * The units a quantity in `unit` may be entered as, for a picker. For mass or
 * volume this is every member of that dimension (kg + g, or L + ml); for a
 * unit with no conversion factor it is just that unit. Always includes `unit`.
 */
export function convertibleUnits(unit: StockUnit): StockUnit[] {
  const dimension = UNIT_DIMENSION[unit];
  if (!isConvertibleDimension(dimension)) return [unit];
  return STOCK_UNITS.filter((u) => UNIT_DIMENSION[u] === dimension);
}

/**
 * Non-throwing {@link convertQty}: returns `null` when the units can't convert.
 * Use in UI where the two units might legitimately mismatch and the caller wants
 * to fall back rather than crash.
 */
export function tryConvertQty(
  qty: number,
  from: StockUnit,
  to: StockUnit,
): number | null {
  if (!canConvertUnit(from, to)) return null;
  return convertQty(qty, from, to);
}
