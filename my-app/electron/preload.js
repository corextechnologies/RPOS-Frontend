// @ts-nocheck
/**
 * The preload bridge — the entire native surface the POS UI can touch.
 *
 * With `contextIsolation` on, the renderer can't reach Node or Electron directly;
 * `contextBridge` hands it exactly one object, `window.rposNative`, with exactly
 * one capability, `print`. That narrowness is the security model: no filesystem,
 * no shell, no arbitrary IPC — just "send these bytes to this LAN printer".
 *
 * The renderer-side adapter (`lib/pos/offline/native-bridge.ts`) reads this and
 * builds the native `DeviceServices.print`.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rposNative", {
  platform: "electron",
  canPrint: true,
  /**
   * @param {"LAN"|"BT"|"USB"} transport
   * @param {string} address  e.g. "192.168.1.50:9100"
   * @param {Uint8Array|number[]} bytes  rendered ESC/POS
   */
  print(transport, address, bytes) {
    // Normalise to a plain array so the payload structured-clones cleanly over IPC.
    const payload = Array.from(bytes);
    return ipcRenderer.invoke("rpos:print", { transport, address, bytes: payload });
  },
});
