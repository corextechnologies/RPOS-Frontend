/**
 * Station routing — split an order into the per-station kitchen tickets, the way
 * the server does for `kot_stations` (§7, §8).
 *
 * Online the server hands back the split. Offline the device has to reproduce it
 * from the cached config, and it must use **the same algorithm** or the grill
 * gets the fries. For each line, resolve its station by:
 *
 *   1. an explicit item override (`item_overrides[menu_item_id]`), else
 *   2. its category (`category_map[category]`), else
 *   3. the expo station (`stations[].is_expo`).
 *
 * The rule that matters most: **never drop a line.** An item that matches
 * nothing goes to expo, and if the config somehow defines no expo station, it
 * falls to a synthetic one rather than vanishing — a missing ticket is a missing
 * meal, and silence is the worst failure here.
 */

import type { PosConfig, PosStation } from "@/lib/types/pos";

/** A line as the router needs to see it — id and category drive the routing. */
export interface RoutableLine {
  menu_item_id: number;
  /** The item's menu category; null routes straight to expo. */
  category: string | null;
  name: string;
  quantity: number;
  modifiers?: string[];
  note?: string | null;
}

export interface StationTicket {
  station: PosStation;
  lines: RoutableLine[];
}

/** The fallback when a config defines no expo station — better than losing a line. */
const SYNTHETIC_EXPO: PosStation = {
  id: 0,
  code: "EXPO",
  name: "Kitchen",
  sort_order: 9999,
  is_expo: true,
};

function expoStation(config: PosConfig): PosStation {
  return config.stations.find((s) => s.is_expo) ?? SYNTHETIC_EXPO;
}

/**
 * Resolve one line to its station id, following override → category → expo.
 * Exposed for testing the resolution independently of the grouping.
 */
export function resolveStationId(line: RoutableLine, config: PosConfig): number {
  const override = config.item_overrides.find((o) => o.menu_item_id === line.menu_item_id);
  if (override) return override.station_id;

  if (line.category != null) {
    const mapped = config.category_map.find((c) => c.category === line.category);
    if (mapped) return mapped.station_id;
  }

  return expoStation(config).id;
}

/**
 * Group an order's lines into per-station tickets, ordered by the stations'
 * `sort_order` so tickets print in the kitchen's own sequence. Stations with no
 * lines are omitted; a line whose resolved station id isn't in the config lands
 * on expo rather than a dangling ticket.
 */
export function resolveStations(lines: RoutableLine[], config: PosConfig): StationTicket[] {
  const expo = expoStation(config);
  const byId = new Map<number, PosStation>(config.stations.map((s) => [s.id, s]));
  if (!byId.has(expo.id)) byId.set(expo.id, expo);

  const groups = new Map<number, RoutableLine[]>();
  for (const line of lines) {
    let stationId = resolveStationId(line, config);
    // A resolved id that isn't a real station (stale override, say) still can't
    // drop the line — send it to expo.
    if (!byId.has(stationId)) stationId = expo.id;
    const bucket = groups.get(stationId);
    if (bucket) bucket.push(line);
    else groups.set(stationId, [line]);
  }

  return [...groups.entries()]
    .map(([stationId, stationLines]) => ({
      station: byId.get(stationId) ?? expo,
      lines: stationLines,
    }))
    .sort((a, b) => a.station.sort_order - b.station.sort_order);
}
