/**
 * The unit a product is stocked and counted in.
 *
 * Quantities are whole numbers of these — "30 g of sauce" is `30`, because sauce
 * is stocked in grams. Same trick as money in minor units: one mental model, no
 * fractional stock, nothing to round.
 *
 * The canonical home for this cross-cutting enum (kitchen, warehouse, admin,
 * branch, and POS all reference it). Mirrors the backend `StockUnit` enum — keep
 * in sync with the DB enum; the last expansion is migration
 * `0022_stock_unit_expansion`.
 */
export type StockUnit =
  // Count / discrete
  | "EACH"
  | "DOZEN"
  | "PACK"
  | "PIECE"
  // Weight
  | "KG"
  | "GRAM"
  // Volume
  | "LITER"
  | "ML"
  // Small measure (baking / liquid)
  | "TEASPOON"
  | "TABLESPOON"
  | "CUP"
  // Portioning (kitchen recipes)
  | "SLICE"
  | "PORTION"
  | "SCOOP"
  // Produce
  | "BUNCH"
  | "HEAD";

/**
 * Every stock unit, in display order (grouped by category). The runtime
 * companion to the `StockUnit` type — use it to build `<Select>` options and the
 * zod enum, so there is one ordered list to keep in step with the backend enum.
 */
export const STOCK_UNITS = [
  // Count / discrete
  "EACH",
  "DOZEN",
  "PACK",
  "PIECE",
  // Weight
  "KG",
  "GRAM",
  // Volume
  "LITER",
  "ML",
  // Small measure (baking / liquid)
  "TEASPOON",
  "TABLESPOON",
  "CUP",
  // Portioning (kitchen recipes)
  "SLICE",
  "PORTION",
  "SCOOP",
  // Produce
  "BUNCH",
  "HEAD",
] as const satisfies readonly StockUnit[];

/**
 * Compact, human-readable labels for a stock unit, shown next to a quantity
 * (e.g. "30 g", "2 tbsp", "1 head"). Measures use conventional abbreviations;
 * discrete and portioning units read better as words.
 *
 * Keep in sync with the `StockUnit` type — and, upstream, the backend enum
 * (`0022_stock_unit_expansion`). A missing entry is a compile error, which is
 * the point: adding a unit forces a label decision here rather than silently
 * falling back to the raw enum name.
 */
export const STOCK_UNIT_LABEL: Record<StockUnit, string> = {
  // Count / discrete
  EACH: "each",
  DOZEN: "dozen",
  PACK: "pack",
  PIECE: "piece",
  // Weight
  KG: "kg",
  GRAM: "g",
  // Volume
  LITER: "L",
  ML: "ml",
  // Small measure (baking / liquid)
  TEASPOON: "tsp",
  TABLESPOON: "tbsp",
  CUP: "cup",
  // Portioning (kitchen recipes)
  SLICE: "slice",
  PORTION: "portion",
  SCOOP: "scoop",
  // Produce
  BUNCH: "bunch",
  HEAD: "head",
};

/**
 * The unit suffix to render after a quantity, or "" when it would add nothing.
 *
 * `EACH` is the implicit default — "3 buns", not "3 each buns" — so it renders
 * blank, matching how the display sites already special-cased it. An unknown
 * value (e.g. a new backend unit not yet mapped) degrades to a lowercased form
 * rather than showing a raw SCREAMING_CASE token.
 */
export function stockUnitLabel(unit?: StockUnit | null): string {
  if (!unit || unit === "EACH") return "";
  return STOCK_UNIT_LABEL[unit] ?? String(unit).toLowerCase();
}

/**
 * The unit label for a dedicated Unit column, where every row shows its unit.
 *
 * Unlike {@link stockUnitLabel} — which blanks `EACH` because "3 each" is noise
 * next to a quantity — a column reads as broken with empty cells, so `EACH`
 * renders as "each" here. Every product has a unit (the backend defaults it to
 * `EACH` and never returns null), so a cell is never blank. An unknown value
 * still degrades to a lowercased form rather than a raw SCREAMING_CASE token.
 */
export function stockUnitColumnLabel(unit: StockUnit): string {
  return STOCK_UNIT_LABEL[unit] ?? String(unit).toLowerCase();
}

// ---- Dimensions & conversion ----
//
// A recipe measured in grams must be able to draw down flour stocked in
// kilograms, so units need a notion of what *kind* of measure they are and how
// to translate between members of the same kind. Two units convert only inside
// one dimension, and only where a fixed factor is meaningful.

/**
 * The physical (or logical) quantity a unit measures.
 *
 * Only `MASS` and `VOLUME` are freely convertible — a fixed factor relates their
 * members (1 kg = 1000 g). The rest are their own dimensions with no cross-unit
 * factor: "2 tbsp" and "1 slice" have no universal size, so a unit there only
 * ever converts to itself. This is what stops a recipe asking for "100 g of
 * eggs" from silently succeeding.
 */
export type UnitDimension =
  | "MASS"
  | "VOLUME"
  | "COUNT"
  | "SMALL_MEASURE"
  | "PORTION"
  | "PRODUCE";

/** Every stock unit's dimension. A missing entry is a compile error. */
export const UNIT_DIMENSION: Record<StockUnit, UnitDimension> = {
  // Count / discrete
  EACH: "COUNT",
  DOZEN: "COUNT",
  PACK: "COUNT",
  PIECE: "COUNT",
  // Weight
  KG: "MASS",
  GRAM: "MASS",
  // Volume
  LITER: "VOLUME",
  ML: "VOLUME",
  // Small measure (baking / liquid)
  TEASPOON: "SMALL_MEASURE",
  TABLESPOON: "SMALL_MEASURE",
  CUP: "SMALL_MEASURE",
  // Portioning (kitchen recipes)
  SLICE: "PORTION",
  PORTION: "PORTION",
  SCOOP: "PORTION",
  // Produce
  BUNCH: "PRODUCE",
  HEAD: "PRODUCE",
};

/**
 * Base units per 1 of this unit, within its dimension's canonical base
 * (GRAM for MASS, ML for VOLUME). Only convertible units appear here; a lookup
 * miss means "not freely convertible" and callers must require an exact match.
 */
export const UNIT_BASE_FACTOR: Partial<Record<StockUnit, number>> = {
  // MASS — canonical base is GRAM
  KG: 1000,
  GRAM: 1,
  // VOLUME — canonical base is ML
  LITER: 1000,
  ML: 1,
};

/** True for the two dimensions whose members share a fixed conversion factor. */
export function isConvertibleDimension(dimension: UnitDimension): boolean {
  return dimension === "MASS" || dimension === "VOLUME";
}

// ---- Quantity formatting ----

/**
 * Render a stock quantity as a string, trimming float noise and trailing zeros.
 *
 * Stock is no longer strictly whole — a recipe drawing 100 g from kg stock leaves
 * 0.7 kg behind — so a quantity may be fractional. This keeps up to three
 * decimals (0.7, 0.25), collapses `0.7000000001` float artifacts, and never
 * shows a pointless `.0` (95, not 95.0).
 */
export function formatQtyNumber(qty: number): string {
  if (!Number.isFinite(qty)) return String(qty);
  // Round to 3 dp to kill binary-float drift, then let String() drop trailing
  // zeros (Number(0.70) === 0.7, so "0.7" falls out for free).
  const rounded = Math.round(qty * 1000) / 1000;
  return String(rounded);
}

/**
 * A quantity with its unit label appended — "95 kg", "0.7 kg", "19" (EACH is
 * blanked, as it is next to any quantity). Use for inline amounts; use
 * {@link stockUnitColumnLabel} where a dedicated Unit column needs "each" spelt
 * out.
 */
export function formatStockQty(qty: number, unit?: StockUnit | null): string {
  const num = formatQtyNumber(qty);
  const label = stockUnitLabel(unit);
  return label ? `${num} ${label}` : num;
}
