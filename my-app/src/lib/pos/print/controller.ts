/**
 * The print controller — the one place that turns an order into paper.
 *
 * It ties the three pieces together: resolve each line to its station (routing),
 * render the ESC/POS (render), and push it to that station's printer via the
 * device seam (`DeviceServices.print`). Used identically online and offline —
 * the only difference is where the routing came from (server `kot_stations` vs.
 * the cached config), and this takes the config either way.
 *
 * When the build can't print (a browser tab — `canPrint` false), it returns
 * `supported: false` and prints nothing; the caller shows the on-screen preview
 * instead. It never pretends. Per-target failures are returned, not thrown, so
 * one dead station printer doesn't lose the others (§11: never silently drop a
 * ticket).
 *
 * `services` is injected (defaulting to the real `deviceServices`) so the wiring
 * is testable without a printer.
 */

import { deviceServices, type DeviceServices, type PrintTransport } from "@/lib/pos/offline/device-services";
import { resolveStations, type RoutableLine } from "./routing";
import { renderKotTicket, renderReceipt, type KotHeader, type ReceiptData } from "./render";
import type { PosConfig, PosPrinter } from "@/lib/types/pos";

export interface PrintFailure {
  target: string;
  error: string;
}

export interface PrintOutcome {
  /** False when this build can't reach a printer at all — show the preview instead. */
  supported: boolean;
  printed: number;
  failures: PrintFailure[];
}

const UNSUPPORTED: PrintOutcome = { supported: false, printed: 0, failures: [] };

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function kitchenPrinterFor(config: PosConfig, stationId: number): PosPrinter | null {
  return config.printers.find((p) => p.role === "KITCHEN" && p.station_id === stationId) ?? null;
}

/**
 * Print one kitchen ticket per resolved station. A station with no printer mapped
 * is a failure (surfaced for the manager), not a silent skip.
 */
export async function printKitchenTickets(
  header: KotHeader,
  lines: RoutableLine[],
  config: PosConfig,
  services: DeviceServices = deviceServices,
): Promise<PrintOutcome> {
  if (!services.canPrint || !services.print) return UNSUPPORTED;

  const failures: PrintFailure[] = [];
  let printed = 0;

  for (const ticket of resolveStations(lines, config)) {
    const printer = kitchenPrinterFor(config, ticket.station.id);
    if (!printer) {
      failures.push({ target: ticket.station.name, error: "no printer mapped to this station" });
      continue;
    }
    try {
      await services.print(
        printer.connection as PrintTransport,
        printer.address,
        renderKotTicket(header, ticket),
      );
      printed += 1;
    } catch (err) {
      failures.push({ target: `${ticket.station.name} (${printer.address})`, error: errText(err) });
    }
  }

  return { supported: true, printed, failures };
}

/** Print the customer receipt to the configured receipt printer (LAN counter or BT tablet). */
export async function printReceipt(
  data: ReceiptData,
  config: PosConfig,
  services: DeviceServices = deviceServices,
): Promise<PrintOutcome> {
  if (!services.canPrint || !services.print) return UNSUPPORTED;

  const rp = config.receipt_printer;
  if (!rp) {
    return { supported: true, printed: 0, failures: [{ target: "receipt", error: "no receipt printer configured" }] };
  }
  try {
    await services.print(rp.connection as PrintTransport, rp.address, renderReceipt(data));
    return { supported: true, printed: 1, failures: [] };
  } catch (err) {
    return { supported: true, printed: 0, failures: [{ target: `receipt (${rp.address})`, error: errText(err) }] };
  }
}
