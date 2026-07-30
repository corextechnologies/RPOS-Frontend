import { localDateOf } from "@/lib/date-range";
import type { ProductionRun } from "@/lib/types/branch";

export interface AggLine {
  productId: string;
  name: string;
  quantity: number;
}

/** One made product on a day: its total made quantity and the ingredients it used. */
export interface ProductEntry {
  productId: string;
  name: string;
  made: number;
  used: AggLine[];
}

export interface DaySummary {
  /** Local `YYYY-MM-DD` — the grouping key. */
  dateKey: string;
  /** A timestamp from the day, for display via `formatDate`. */
  sampleIso: string;
  /** One entry per product made that day. */
  products: ProductEntry[];
}

/** Trim floating-point noise off summed quantities (0.30000000001 → 0.3). */
export function roundQty(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Collapse production runs into one summary per production day, and within a day
 * one entry per product made — each pairing that product's summed made quantity
 * with the ingredients it consumed. Runs from any source (branch requests,
 * production targets, make-something-extra) merge, since they share one history
 * and a day's batches share a made-date (and so an expiry). Different days stay
 * separate. Days are newest first; products within a day are ordered by name.
 *
 * Assumes one OUTPUT line per run (the kitchen produce model): its INPUT lines
 * are the ingredients that made that output.
 */
export function aggregateRunsByDay(runs: ProductionRun[]): DaySummary[] {
  const byDay = new Map<
    string,
    {
      dateKey: string;
      sampleIso: string;
      // keyed by output product id
      products: Map<
        string,
        { productId: string; name: string; made: number; used: Map<string, AggLine> }
      >;
    }
  >();

  for (const run of runs) {
    if (!run.created_at) continue;
    const output = run.lines.find((l) => l.role === "OUTPUT");
    if (!output) continue;

    const dateKey = localDateOf(run.created_at);
    let day = byDay.get(dateKey);
    if (!day) {
      day = { dateKey, sampleIso: run.created_at, products: new Map() };
      byDay.set(dateKey, day);
    }

    let entry = day.products.get(output.product_id);
    if (!entry) {
      entry = {
        productId: output.product_id,
        name: output.product_name ?? output.product_id,
        made: 0,
        used: new Map(),
      };
      day.products.set(output.product_id, entry);
    }
    entry.made += output.quantity;

    for (const line of run.lines) {
      if (line.role !== "INPUT") continue;
      const prev = entry.used.get(line.product_id);
      entry.used.set(line.product_id, {
        productId: line.product_id,
        name: line.product_name ?? line.product_id,
        quantity: (prev?.quantity ?? 0) + line.quantity,
      });
    }
  }

  return [...byDay.values()]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((day) => ({
      dateKey: day.dateKey,
      sampleIso: day.sampleIso,
      products: [...day.products.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({
          productId: p.productId,
          name: p.name,
          made: roundQty(p.made),
          used: [...p.used.values()].map((l) => ({ ...l, quantity: roundQty(l.quantity) })),
        })),
    }));
}
