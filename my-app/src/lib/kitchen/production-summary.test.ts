import { describe, expect, it } from "vitest";
import { aggregateRunsByDay } from "./production-summary";
import type { ProductionRun } from "@/lib/types/branch";

function run(id: string, createdAt: string, lines: ProductionRun["lines"]): ProductionRun {
  return {
    id,
    location_type: "KITCHEN",
    location_id: "kit-001",
    recipe_id: "r1",
    created_at: createdAt,
    lines,
  };
}

describe("aggregateRunsByDay", () => {
  it("groups a day into one entry per product, each with its own used/made", () => {
    // Two Buns runs plus a Chocolate Cake run, all on the same local day.
    const runs: ProductionRun[] = [
      run("k1", "2026-07-30T09:00:00", [
        { id: "l1", product_id: "prod-004", product_name: "Flour", role: "INPUT", quantity: 0.15 },
        { id: "l2", product_id: "prod-002", product_name: "Buns", role: "OUTPUT", quantity: 1 },
      ]),
      run("k2", "2026-07-30T10:00:00", [
        { id: "l3", product_id: "prod-004", product_name: "Flour", role: "INPUT", quantity: 0.15 },
        { id: "l4", product_id: "prod-002", product_name: "Buns", role: "OUTPUT", quantity: 1 },
      ]),
      run("k3", "2026-07-30T11:00:00", [
        { id: "l5", product_id: "prod-007", product_name: "Chocolate", role: "INPUT", quantity: 0.2 },
        { id: "l6", product_id: "prod-004", product_name: "Flour", role: "INPUT", quantity: 0.5 },
        { id: "l7", product_id: "prod-006", product_name: "Choclate Cake", role: "OUTPUT", quantity: 2 },
      ]),
    ];

    const days = aggregateRunsByDay(runs);
    expect(days).toHaveLength(1);
    const day = days[0];
    expect(day.dateKey).toBe("2026-07-30");

    // One entry per product, ordered by name (Buns, then Choclate Cake).
    expect(day.products.map((p) => p.name)).toEqual(["Buns", "Choclate Cake"]);

    // Buns: 1 + 1 = 2 made, Flour 0.15 + 0.15 = 0.3 used (only its own ingredient).
    const buns = day.products[0];
    expect(buns.made).toBe(2);
    expect(buns.used).toEqual([{ productId: "prod-004", name: "Flour", quantity: 0.3 }]);

    // Chocolate Cake: 2 made, its own Chocolate 0.2 + Flour 0.5.
    const cake = day.products[1];
    expect(cake.made).toBe(2);
    expect(Object.fromEntries(cake.used.map((l) => [l.name, l.quantity]))).toEqual({
      Chocolate: 0.2,
      Flour: 0.5,
    });
  });

  it("keeps different days as separate cards, newest first", () => {
    const runs: ProductionRun[] = [
      run("k1", "2026-07-29T09:00:00", [
        { id: "l1", product_id: "prod-002", product_name: "Buns", role: "OUTPUT", quantity: 3 },
      ]),
      run("k2", "2026-07-30T09:00:00", [
        { id: "l2", product_id: "prod-002", product_name: "Buns", role: "OUTPUT", quantity: 5 },
      ]),
    ];

    const days = aggregateRunsByDay(runs);
    expect(days.map((d) => d.dateKey)).toEqual(["2026-07-30", "2026-07-29"]);
    expect(days[0].products[0].made).toBe(5);
    expect(days[1].products[0].made).toBe(3);
  });
});
