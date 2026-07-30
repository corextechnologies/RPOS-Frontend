import { describe, expect, it, vi } from "vitest";
import { printKitchenTickets, printReceipt } from "./controller";
import type { DeviceServices } from "@/lib/pos/offline/device-services";
import type { RoutableLine } from "./routing";
import type { ReceiptData } from "./render";
import type { PosConfig } from "@/lib/types/pos";

function config(over: Partial<PosConfig> = {}): PosConfig {
  return {
    config_version: 1,
    stations: [
      { id: 1, code: "GRILL", name: "Grill", sort_order: 1, is_expo: false },
      { id: 3, code: "EXPO", name: "Expo", sort_order: 3, is_expo: true },
    ],
    printers: [
      { id: 10, role: "KITCHEN", station_id: 1, connection: "LAN", address: "192.168.1.50:9100", model: "ESC_POS" },
      { id: 11, role: "KITCHEN", station_id: 3, connection: "LAN", address: "192.168.1.51:9100", model: "ESC_POS" },
    ],
    category_map: [{ category: "Grill", station_id: 1 }],
    item_overrides: [],
    receipt_printer: { printer_id: 9, connection: "LAN", address: "192.168.1.20:9100" },
    payment_accounts: [],
    ...over,
  };
}

function services(over: Partial<DeviceServices> = {}): DeviceServices {
  return {
    outbox: {} as DeviceServices["outbox"],
    canPrint: true,
    print: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

const lines: RoutableLine[] = [
  { menu_item_id: 1, category: "Grill", name: "Burger", quantity: 1 },
  { menu_item_id: 2, category: "Dessert", name: "Ice cream", quantity: 1 }, // → expo
];

const header = { order_no: "A-101", order_type: "TAKEAWAY" };

describe("printKitchenTickets", () => {
  it("pushes one ticket per station to that station's printer", async () => {
    const svc = services();
    const out = await printKitchenTickets(header, lines, config(), svc);

    expect(out.supported).toBe(true);
    expect(out.printed).toBe(2);
    expect(out.failures).toEqual([]);

    const print = svc.print as ReturnType<typeof vi.fn>;
    expect(print).toHaveBeenCalledTimes(2);
    // Grill line → grill printer; dessert → expo printer.
    const addresses = print.mock.calls.map((c) => c[1]);
    expect(addresses).toContain("192.168.1.50:9100");
    expect(addresses).toContain("192.168.1.51:9100");
    // Bytes, over the LAN transport.
    expect(print.mock.calls[0][0]).toBe("LAN");
    expect(print.mock.calls[0][2]).toBeInstanceOf(Uint8Array);
  });

  it("reports a station with no printer as a failure, not a silent skip", async () => {
    const cfg = config({
      printers: [
        { id: 10, role: "KITCHEN", station_id: 1, connection: "LAN", address: "192.168.1.50:9100", model: "ESC_POS" },
      ],
    });
    const out = await printKitchenTickets(header, lines, cfg, services());
    expect(out.printed).toBe(1);
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0].target).toContain("Expo");
  });

  it("keeps printing other stations when one printer errors", async () => {
    const print = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED 192.168.1.50"))
      .mockResolvedValue(undefined);
    const out = await printKitchenTickets(header, lines, config(), services({ print }));
    expect(out.printed).toBe(1);
    expect(out.failures).toHaveLength(1);
    expect(out.failures[0].error).toContain("ECONNREFUSED");
  });

  it("returns unsupported (no print) when the build can't print", async () => {
    const out = await printKitchenTickets(header, lines, config(), services({ canPrint: false, print: undefined }));
    expect(out.supported).toBe(false);
    expect(out.printed).toBe(0);
  });
});

describe("printReceipt", () => {
  const data: ReceiptData = {
    order_no: "A-101",
    lines: [{ name: "Burger", quantity: 1, line_total_minor: 45000 }],
    subtotal_minor: 45000,
    discount_minor: 0,
    tax_minor: 0,
    total_minor: 45000,
    payment: { method: "CASH", amount_minor: 45000, tendered_minor: 50000, change_minor: 5000 },
    currency: "PKR",
    minorUnits: 2,
  };

  it("prints to the configured receipt printer", async () => {
    const svc = services();
    const out = await printReceipt(data, config(), svc);
    expect(out.printed).toBe(1);
    const print = svc.print as ReturnType<typeof vi.fn>;
    expect(print).toHaveBeenCalledWith("LAN", "192.168.1.20:9100", expect.any(Uint8Array));
  });

  it("fails cleanly when no receipt printer is configured", async () => {
    const out = await printReceipt(data, config({ receipt_printer: null }), services());
    expect(out.printed).toBe(0);
    expect(out.failures[0].error).toContain("no receipt printer");
  });
});
