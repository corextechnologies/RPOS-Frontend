/**
 * `DeviceServices` — the seam between the one React UI and the per-device native
 * capabilities it can't do in a browser tab (§2 of the contract).
 *
 * A tab cannot open a raw TCP socket to a `:9100` kitchen printer, drive a
 * classic Bluetooth thermal printer, or hold a queue that survives the OS
 * killing the app. Those are provided by the shell:
 *
 * | profile  | shell     | this interface is backed by                     |
 * |----------|-----------|-------------------------------------------------|
 * | COUNTER  | Electron  | `net.Socket` → LAN `:9100`; SQLite outbox       |
 * | CURBSIDE | Capacitor | Bluetooth receipt printing; SQLite outbox       |
 * | (web/dev)| browser   | IndexedDB outbox; printing lands in a later slice |
 *
 * Everything above this module talks to `deviceServices`, never to IndexedDB or
 * a socket directly, so swapping the web impl for a native one is a single wiring
 * change here and nowhere else. That is what makes "build on web first, add the
 * native shells later" a composition rather than a rewrite.
 */

import { idbOutbox, type OutboxStore } from "./outbox";

/** How a ticket reaches a printer. LAN = raw TCP `:9100`; BT = Bluetooth; USB later. */
export type PrintTransport = "LAN" | "BT" | "USB";

export interface DeviceServices {
  /** The durable outbox (§13). Web = IndexedDB; native = SQLite. */
  outbox: OutboxStore;

  /**
   * Render-and-push is the app's job, never the backend's (§11). This member
   * lands with the printing slice:
   *
   *   print(transport: PrintTransport, address: string, bytes: Uint8Array): Promise<void>
   *
   * It is intentionally absent until then rather than stubbed — a method that
   * silently no-ops would let a "printed" ticket never reach paper. Callers gate
   * on its presence when it arrives.
   */
}

/**
 * The active implementation. The web/dev build wires the IndexedDB outbox; an
 * Electron/Capacitor entry point replaces this object (same shape) at startup.
 */
export const deviceServices: DeviceServices = {
  outbox: idbOutbox,
};
