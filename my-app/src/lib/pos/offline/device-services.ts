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
import { getNative } from "./native-bridge";

/** How a ticket reaches a printer. LAN = raw TCP `:9100`; BT = Bluetooth; USB later. */
export type PrintTransport = "LAN" | "BT" | "USB";

export interface DeviceServices {
  /** The durable outbox (§13). Web = IndexedDB; native = SQLite. */
  outbox: OutboxStore;

  /**
   * Whether this build can physically reach a printer. False in the browser — a
   * tab cannot open a `:9100` socket or a Bluetooth printer — true once wrapped
   * in Electron/Capacitor. Callers render the ESC/POS either way but only *push*
   * it when this is true; otherwise they fall back to the on-screen preview.
   */
  readonly canPrint: boolean;

  /**
   * Push rendered ESC/POS bytes to a printer over its transport (§11). Present
   * only when `canPrint` is true — deliberately absent in the web build rather
   * than a silent no-op, because a "printed" ticket that never reached paper is
   * the one failure a kitchen can't see. The native shell supplies it:
   * `net.Socket` → LAN `:9100` (Electron), Bluetooth (Capacitor).
   */
  print?: (transport: PrintTransport, address: string, bytes: Uint8Array) => Promise<void>;
}

/**
 * The active implementation. The outbox is always the IndexedDB store (a bare
 * Electron renderer persists it just fine; a SQLite-backed store can replace it
 * later behind this same seam). Printing is wired from the native bridge when a
 * shell is present — so the *same build* is a no-print web app in a browser and
 * a real-printing till inside Electron, decided at runtime by what
 * `window.rposNative` exposes.
 */
function nativePrint(): Pick<DeviceServices, "canPrint" | "print"> {
  const native = getNative();
  if (!native?.canPrint) return { canPrint: false };
  return {
    canPrint: true,
    print: (transport, address, bytes) =>
      native.print(transport, address, bytes).then(() => {}),
  };
}

export const deviceServices: DeviceServices = {
  outbox: idbOutbox,
  ...nativePrint(),
};
