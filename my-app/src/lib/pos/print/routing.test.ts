import { describe, expect, it } from "vitest";
import { resolveStationId, resolveStations, type RoutableLine } from "./routing";
import type { PosConfig } from "@/lib/types/pos";

function config(over: Partial<PosConfig> = {}): PosConfig {
  return {
    config_version: 1,
    stations: [
      { id: 1, code: "GRILL", name: "Grill", sort_order: 1, is_expo: false },
      { id: 2, code: "FRY", name: "Fryer", sort_order: 2, is_expo: false },
      { id: 3, code: "EXPO", name: "Expo", sort_order: 3, is_expo: true },
    ],
    printers: [],
    category_map: [
      { category: "Grill", station_id: 1 },
      { category: "Sides", station_id: 2 },
    ],
    item_overrides: [{ menu_item_id: 88, station_id: 2 }],
    receipt_printer: null,
    payment_accounts: [],
    ...over,
  };
}

function line(over: Partial<RoutableLine> = {}): RoutableLine {
  return { menu_item_id: 1, category: "Grill", name: "Burger", quantity: 1, ...over };
}

describe("resolveStationId", () => {
  it("prefers an item override over the category map", () => {
    // Item 88 is category Grill (→1) but overridden to the fryer (2).
    expect(resolveStationId(line({ menu_item_id: 88, category: "Grill" }), config())).toBe(2);
  });

  it("falls back to the category map", () => {
    expect(resolveStationId(line({ menu_item_id: 5, category: "Sides" }), config())).toBe(2);
  });

  it("routes an unmapped category to the expo station", () => {
    expect(resolveStationId(line({ menu_item_id: 5, category: "Dessert" }), config())).toBe(3);
  });

  it("routes a null category to expo", () => {
    expect(resolveStationId(line({ category: null }), config())).toBe(3);
  });

  it("uses a synthetic expo (id 0) when the config defines none", () => {
    const noExpo = config({
      stations: [{ id: 1, code: "GRILL", name: "Grill", sort_order: 1, is_expo: false }],
    });
    expect(resolveStationId(line({ category: "Dessert" }), noExpo)).toBe(0);
  });
});

describe("resolveStations", () => {
  it("groups lines per station, ordered by sort_order, dropping nothing", () => {
    const lines = [
      line({ menu_item_id: 1, category: "Grill", name: "Burger" }),
      line({ menu_item_id: 2, category: "Sides", name: "Fries" }),
      line({ menu_item_id: 3, category: "Dessert", name: "Ice cream" }), // → expo
      line({ menu_item_id: 4, category: "Grill", name: "Steak" }),
    ];
    const tickets = resolveStations(lines, config());

    expect(tickets.map((t) => t.station.code)).toEqual(["GRILL", "FRY", "EXPO"]);
    expect(tickets[0].lines.map((l) => l.name)).toEqual(["Burger", "Steak"]);
    expect(tickets[1].lines.map((l) => l.name)).toEqual(["Fries"]);
    expect(tickets[2].lines.map((l) => l.name)).toEqual(["Ice cream"]);

    const total = tickets.reduce((n, t) => n + t.lines.length, 0);
    expect(total).toBe(lines.length); // never drop a line
  });

  it("sends a line with a stale override station to expo rather than losing it", () => {
    const cfg = config({ item_overrides: [{ menu_item_id: 1, station_id: 999 }] });
    const tickets = resolveStations([line({ menu_item_id: 1, category: "Grill" })], cfg);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].station.is_expo).toBe(true);
  });

  it("returns nothing for an empty order", () => {
    expect(resolveStations([], config())).toEqual([]);
  });
});
