// @ts-nocheck
/**
 * The COUNTER terminal's Electron main process.
 *
 * Its whole reason to exist is the one thing a browser tab cannot do: open a raw
 * TCP socket to a kitchen/receipt printer on the branch LAN (`:9100`). It loads
 * the same Next.js POS app in a window and exposes exactly that one native
 * capability — LAN printing — to the renderer over a locked-down IPC bridge
 * (see preload.js). Nothing else about the app changes; the UI is identical to
 * the web build.
 *
 * Security posture: `contextIsolation: true`, `nodeIntegration: false`. The
 * renderer never touches Node — it calls `window.rposNative.print(...)`, which
 * is the only surface preload exposes, and this process does the socket work.
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const net = require("node:net");
const path = require("node:path");

/** Where the POS UI is served. Dev: `next dev`. Prod: `next start` or a kiosk URL. */
const APP_URL = process.env.RPOS_APP_URL || "http://localhost:3000/pos";
/** Fail a stuck printer rather than hang the sale forever. */
const PRINT_TIMEOUT_MS = Number(process.env.RPOS_PRINT_TIMEOUT_MS) || 8000;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    // A real till runs full-screen with no chrome; opt in via env so dev keeps
    // the window frame.
    fullscreen: process.env.RPOS_KIOSK === "1",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);
  if (process.env.RPOS_DEVTOOLS === "1") win.webContents.openDevTools();
}

/**
 * Push rendered ESC/POS bytes to a LAN printer. The renderer sends the transport
 * ("LAN"), the `host:port` address from the cached config, and the bytes as a
 * plain number array (structured-clone-safe over IPC). Resolves when the bytes
 * are flushed and the socket closes; rejects on connect/write error or timeout —
 * the client turns a rejection into a FAILED print job it can surface and retry.
 */
ipcMain.handle("rpos:print", async (_event, req) => {
  const { transport, address, bytes } = req ?? {};
  if (transport !== "LAN") {
    // Bluetooth/USB belong to the Capacitor shell; this one is LAN only.
    throw new Error(`Electron shell prints LAN only (got "${transport}")`);
  }
  const [host, portRaw] = String(address).split(":");
  const port = Number(portRaw) || 9100;
  if (!host) throw new Error(`Bad printer address: "${address}"`);

  await sendToPrinter(host, port, Buffer.from(bytes));
  return { ok: true };
});

function sendToPrinter(host, port, payload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    };

    socket.setTimeout(PRINT_TIMEOUT_MS);
    socket.once("timeout", () => finish(new Error(`Printer ${host}:${port} timed out`)));
    socket.once("error", finish);
    socket.once("close", () => finish());
    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) finish(err);
        else socket.end(); // flush, then let "close" resolve
      });
    });
  });
}

app.whenReady().then(createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  // A till is single-window; on non-mac, closing it quits.
  if (process.platform !== "darwin") app.quit();
});
