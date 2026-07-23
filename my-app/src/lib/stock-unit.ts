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
