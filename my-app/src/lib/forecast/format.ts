/**
 * Display helpers for the forecast surfaces. The one rule that matters:
 * decimals arrive as strings ("20.000", "1.350") and must not be `parseFloat`ed
 * back into numbers for display — we trim trailing zeros textually so precision
 * is never touched.
 */
import type { ForecastMaturity } from "@/lib/types/forecast";

export type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

/** "20.000" → "20", "1.350" → "1.35", "0.300" → "0.3". String in, string out. */
export function trimDecimal(value: string | null | undefined): string {
  if (value == null) return "";
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

/** A multiplier chip label, e.g. "×3.5". */
export function multiplierLabel(value: string): string {
  return `×${trimDecimal(value)}`;
}

/** True when a multiplier is exactly 1 — no effect, so render no chip (§12.7). */
export function isNeutralMultiplier(value: string): boolean {
  return Number(value) === 1;
}

export const MATURITY_LABELS: Record<ForecastMaturity, string> = {
  assumption: "Estimate — no sales yet",
  mostly_assumption: "Early — few days of data",
  blended: "Building confidence",
  observed: "Based on sales history",
};

export const MATURITY_VARIANTS: Record<ForecastMaturity, BadgeVariant> = {
  assumption: "outline",
  mostly_assumption: "warning",
  blended: "secondary",
  observed: "success",
};
