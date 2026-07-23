import { stockUnitLabel, type StockUnit } from "@/lib/stock-unit";

/**
 * Pack helper for products bought in bags/bottles but stocked in a base unit.
 *
 * Ledger truth is always `quantity` in `stock_unit`. `units_per_pack` means
 * "1 pack = N stock units" (e.g. flour stocked in KG with units_per_pack=5 →
 * one bag is 5 kg). Packs on screen are derived: qty / units_per_pack.
 */

/** Normalize API/form values; blank or invalid → null (no pack helper). */
export function normalizeUnitsPerPack(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** How many packs `qty` represents, or null when pack size is unset. */
export function packsFromQty(
  qty: number,
  unitsPerPack: number | null | undefined,
): number | null {
  const pack = normalizeUnitsPerPack(unitsPerPack);
  if (!pack) return null;
  return qty / pack;
}

/** Convert a pack count into ledger quantity. */
export function qtyFromPacks(
  packs: number,
  unitsPerPack: number | null | undefined,
): number | null {
  const pack = normalizeUnitsPerPack(unitsPerPack);
  if (!pack) return null;
  return packs * pack;
}

/**
 * Compact pack label for tables: "19 packs" or "19.2 packs" when partial.
 * Returns "" when there is no pack size.
 */
export function packCountLabel(
  qty: number,
  unitsPerPack: number | null | undefined,
): string {
  const packs = packsFromQty(qty, unitsPerPack);
  if (packs === null) return "";
  const rounded = Number.isInteger(packs) ? String(packs) : packs.toFixed(1);
  return `${rounded} pack${packs === 1 ? "" : "s"}`;
}

/**
 * Human helper for request forms: "5 packs = 25 kg".
 */
export function packConversionHint(
  packs: number,
  unitsPerPack: number | null | undefined,
  stockUnit: StockUnit,
): string {
  const qty = qtyFromPacks(packs, unitsPerPack);
  if (qty === null) return "";
  const unit = stockUnitLabel(stockUnit) || stockUnit.toLowerCase();
  const packWord = packs === 1 ? "pack" : "packs";
  return `${packs} ${packWord} = ${qty} ${unit}`;
}

/**
 * Inverse hint: "25 kg = 5 packs".
 */
export function qtyConversionHint(
  qty: number,
  unitsPerPack: number | null | undefined,
  stockUnit: StockUnit,
): string {
  const packs = packsFromQty(qty, unitsPerPack);
  if (packs === null) return "";
  const unit = stockUnitLabel(stockUnit) || stockUnit.toLowerCase();
  const rounded = Number.isInteger(packs) ? String(packs) : packs.toFixed(1);
  const packWord = packs === 1 ? "pack" : "packs";
  return `${qty} ${unit} = ${rounded} ${packWord}`;
}
