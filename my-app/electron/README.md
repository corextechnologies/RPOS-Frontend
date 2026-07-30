# RPOS COUNTER shell (Electron)

The desktop wrapper for the **COUNTER** terminal profile. It runs the exact same
Next.js POS UI as the web build and adds the one capability a browser tab cannot
have: **printing to LAN kitchen/receipt printers over raw TCP `:9100`**.

Nothing about the UI changes. At startup the app checks for `window.rposNative`
(exposed by `preload.js`); when it's there, `deviceServices.canPrint` becomes
true and `deviceServices.print()` sends bytes to the printer. In a plain browser
that object is absent and the app falls back to the on-screen preview — same code,
decided at runtime.

## Files

| File | Role |
|------|------|
| `main.js` | Electron main process. Opens the window, loads the POS URL, and handles the `rpos:print` IPC by opening a TCP socket to `host:port` and writing the ESC/POS bytes. |
| `preload.js` | The only bridge to the renderer. `contextIsolation` on, `nodeIntegration` off — exposes exactly `window.rposNative.print(transport, address, bytes)` and nothing else. |

The renderer side lives in the app: `src/lib/pos/offline/native-bridge.ts` reads
`window.rposNative`, and `src/lib/pos/offline/device-services.ts` wires it into
the `print` seam. The ESC/POS itself comes from `src/lib/pos/print/*`.

## Run it (development)

```bash
# one command — starts `next dev` and launches Electron once the app is up
npm run electron:dev
```

Or in two terminals:

```bash
npm run dev            # serve the POS at http://localhost:3000/pos
npm run electron       # open the Electron window against it
```

### Environment

| Var | Default | Meaning |
|-----|---------|---------|
| `RPOS_APP_URL` | `http://localhost:3000/pos` | URL the window loads. Point at `next start` or a kiosk host in production. |
| `RPOS_KIOSK` | — | `1` → full-screen, no window chrome (a real till). |
| `RPOS_DEVTOOLS` | — | `1` → open DevTools. |
| `RPOS_PRINT_TIMEOUT_MS` | `8000` | How long to wait on a printer before failing the job. |

## Verifying real printing

This needs actual hardware and can't be done in CI:

1. A LAN thermal printer reachable by IP on the branch subnet, listening on `:9100`.
2. Populate the cached print config (`GET /pos/config`, §7) so a station maps to
   that printer's `address`.
3. Send an order — the kitchen ticket should print; a failed printer surfaces as
   a `FAILED` print job (§11), not a silent drop.

A quick transport smoke test without the UI:

```bash
# pipe a few bytes to a printer to confirm the socket path
printf 'RPOS test\n\n\n' | nc 192.168.1.50 9100
```

## Packaging (later)

Production installers are a follow-up: add `electron-builder`, a `build` block,
and code-signing per OS. Out of scope for this slice, which delivers the running
shell and the print transport.

## Security

- `contextIsolation: true`, `nodeIntegration: false` — the renderer never gets
  Node. The **only** thing it can ask the shell to do is print.
- The window loads a trusted first-party URL. If that ever becomes
  operator-configurable, validate it before `loadURL`.
