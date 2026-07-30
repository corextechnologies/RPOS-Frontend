/**
 * The renderer's view of the native shell (Electron/Capacitor), if one is
 * wrapping the app. In the plain web build there is none and everything here
 * resolves to "not available", which is exactly what keeps the web build honest
 * about not being able to print.
 *
 * The shape mirrors what `electron/preload.js` (and, later, the Capacitor plugin)
 * exposes on `window.rposNative`. Type-only import of `PrintTransport` so this
 * module has no runtime dependency on `device-services` — the two reference each
 * other and only the type crosses, which erases.
 */

import type { PrintTransport } from "./device-services";

export interface RposNative {
  platform: "electron" | "capacitor";
  canPrint: boolean;
  print(
    transport: PrintTransport,
    address: string,
    bytes: Uint8Array | number[],
  ): Promise<unknown>;
}

declare global {
  interface Window {
    rposNative?: RposNative;
  }
}

/** The native bridge, or null in the web build / during SSR. */
export function getNative(): RposNative | null {
  if (typeof window === "undefined") return null;
  return window.rposNative ?? null;
}
