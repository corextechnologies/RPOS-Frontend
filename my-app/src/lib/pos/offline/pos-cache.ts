/**
 * The read-caches a till sells from when the network is gone.
 *
 * Three snapshots, each written on every successful online fetch and read back
 * when a fetch fails with a network error (never on an auth or device fault —
 * those mean "stop", not "fall back"):
 *
 * - **bootstrap** — the pack (currency, tax, payment methods) and capabilities.
 *   Without it a cold-started offline till can't even render prices or know
 *   which tender buttons to show.
 * - **menu** — the priced catalogue. Stored with its ETag; a published menu
 *   version is immutable, so the ETag is authoritative and a `304` means "the
 *   cached copy is still exactly right".
 * - **availability** — the last-known 86 state, so a reboot mid-outage doesn't
 *   forget which items were off.
 *
 * `config` (printers/routing/payment accounts, §7 NEW·P1) has accessors here
 * too, ready for when that endpoint lands and the print controller needs it
 * offline. Nothing fetches it yet.
 *
 * Every value is wrapped in a small envelope carrying `saved_at`, so a later
 * "menu cached 2h ago" staleness hint (WP-G) is a read away and doesn't need a
 * schema change.
 */

import { kvGet, kvSet, kvDelete } from "./db";
import type {
  AvailabilityRow,
  PosBootstrap,
  PosConfig,
  PosMenu,
} from "@/lib/types/pos";

const KEY = {
  bootstrap: "snapshot:bootstrap",
  menu: "snapshot:menu",
  availability: "snapshot:availability",
  config: "snapshot:config",
} as const;

/** Bumped only if a stored shape changes incompatibly; a mismatch reads as a miss. */
const SNAPSHOT_VERSION = 1;

interface Snapshot<T> {
  v: number;
  saved_at: string;
  data: T;
}

export interface CachedSnapshot<T> {
  data: T;
  savedAt: string;
}

function wrap<T>(data: T): Snapshot<T> {
  return { v: SNAPSHOT_VERSION, saved_at: new Date().toISOString(), data };
}

async function read<T>(key: string): Promise<CachedSnapshot<T> | null> {
  const snap = await kvGet<Snapshot<T>>(key);
  if (!snap || snap.v !== SNAPSHOT_VERSION) return null;
  return { data: snap.data, savedAt: snap.saved_at };
}

// ---- bootstrap ----

export function cacheBootstrap(bootstrap: PosBootstrap): Promise<void> {
  return kvSet(KEY.bootstrap, wrap(bootstrap));
}

export async function readCachedBootstrap(): Promise<CachedSnapshot<PosBootstrap> | null> {
  return read<PosBootstrap>(KEY.bootstrap);
}

// ---- menu (with ETag) ----

interface MenuSnapshotData {
  menu: PosMenu;
  etag: string | null;
}

/**
 * Only the published menu is cached (the `version === undefined` fetch).
 * Historical versions are pulled for a one-off reprint and shouldn't evict the
 * copy the till sells from.
 */
export function cacheMenu(menu: PosMenu, etag: string | null): Promise<void> {
  return kvSet(KEY.menu, wrap<MenuSnapshotData>({ menu, etag }));
}

export async function readCachedMenu(): Promise<CachedSnapshot<MenuSnapshotData> | null> {
  return read<MenuSnapshotData>(KEY.menu);
}

// ---- availability ----

export function cacheAvailability(rows: AvailabilityRow[]): Promise<void> {
  return kvSet(KEY.availability, wrap(rows));
}

export async function readCachedAvailability(): Promise<CachedSnapshot<AvailabilityRow[]> | null> {
  return read<AvailabilityRow[]>(KEY.availability);
}

// ---- config (§7 NEW·P1 — scaffolded, not yet fetched) ----

export function cacheConfig(config: PosConfig): Promise<void> {
  return kvSet(KEY.config, wrap(config));
}

export async function readCachedConfig(): Promise<CachedSnapshot<PosConfig> | null> {
  return read<PosConfig>(KEY.config);
}

/**
 * Drop every snapshot. Belongs on the settings-screen "Reset this terminal"
 * path (`posSession.reset()`), so a decommissioned device leaves no priced menu
 * or branch config behind.
 */
export async function clearPosCache(): Promise<void> {
  await Promise.all([
    kvDelete(KEY.bootstrap),
    kvDelete(KEY.menu),
    kvDelete(KEY.availability),
    kvDelete(KEY.config),
  ]);
}
