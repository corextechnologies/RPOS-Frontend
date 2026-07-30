/**
 * The ticket renderers — one kitchen ticket, one customer receipt, each in two
 * forms from the same source:
 *
 * - **text** (`render*Text`) — a plain-string preview for the on-screen dialog
 *   and for tests, where asserting on a deterministic string beats asserting on
 *   a byte stream.
 * - **bytes** (`render*`) — the ESC/POS the shell pushes to the printer.
 *
 * Keeping both off one code path is the point: the layout a cashier previews is
 * byte-for-byte the layout that prints, online or offline (§11).
 *
 * The hard rule from the contract shows up here structurally: **the kitchen
 * ticket carries no prices** — "the kitchen makes food, not money" — so there is
 * no money field anywhere in the KOT renderer to accidentally fill.
 */

import { formatMinor } from "@/lib/money";
import { EscPosBuilder, twoColumns } from "./escpos";
import type { StationTicket } from "./routing";

/** Character columns for the paper. 32 = 58 mm, 48 = 80 mm, at Font A. */
const DEFAULT_WIDTH = 32;

export interface KotHeader {
  order_no: string;
  order_type?: string | null;
  channel?: string | null;
  vehicle_plate?: string | null;
  vehicle_colour?: string | null;
  bay_no?: string | null;
  table_no?: string | null;
}

// ---- kitchen ticket ----

function kotBodyLines(header: KotHeader, ticket: StationTicket): string[] {
  const out: string[] = [];
  out.push(ticket.station.name.toUpperCase());
  out.push(header.order_no);

  const tags = [header.order_type, header.channel].filter(Boolean).join(" · ");
  if (tags) out.push(tags);

  const vehicle = [header.vehicle_plate, header.vehicle_colour].filter(Boolean).join(" ");
  if (vehicle) out.push(`CAR: ${vehicle}`);
  if (header.bay_no) out.push(`BAY ${header.bay_no}`);
  if (header.table_no) out.push(`TABLE ${header.table_no}`);

  out.push("-".repeat(DEFAULT_WIDTH));
  for (const line of ticket.lines) {
    out.push(`${line.quantity} x ${line.name}`);
    for (const mod of line.modifiers ?? []) out.push(`   + ${mod}`);
    if (line.note) out.push(`   ** ${line.note.toUpperCase()}`);
  }
  return out;
}

/** Plain-text kitchen ticket for preview and tests. Carries no prices, by design. */
export function renderKotText(header: KotHeader, ticket: StationTicket): string {
  return kotBodyLines(header, ticket).join("\n");
}

export function renderKotTicket(header: KotHeader, ticket: StationTicket): Uint8Array {
  const b = new EscPosBuilder().init().align("center");
  b.bold(true).size(2, 2).line(ticket.station.name.toUpperCase()).size(1, 1).bold(false);
  b.line(header.order_no);

  const tags = [header.order_type, header.channel].filter(Boolean).join(" · ");
  if (tags) b.line(tags);

  const vehicle = [header.vehicle_plate, header.vehicle_colour].filter(Boolean).join(" ");
  if (vehicle) b.bold(true).line(`CAR: ${vehicle}`).bold(false);
  if (header.bay_no) b.line(`BAY ${header.bay_no}`);
  if (header.table_no) b.line(`TABLE ${header.table_no}`);

  b.align("left").line("-".repeat(DEFAULT_WIDTH));
  for (const line of ticket.lines) {
    b.bold(true).line(`${line.quantity} x ${line.name}`).bold(false);
    for (const mod of line.modifiers ?? []) b.line(`   + ${mod}`);
    if (line.note) b.bold(true).line(`   ** ${line.note.toUpperCase()}`).bold(false);
  }
  return b.cut().build();
}

// ---- customer receipt ----

export interface ReceiptLine {
  name: string;
  quantity: number;
  line_total_minor: number;
  modifiers?: string[];
}

export interface ReceiptPayment {
  method: string;
  amount_minor: number;
  tendered_minor?: number | null;
  change_minor?: number | null;
}

export interface ReceiptData {
  branch_name?: string | null;
  order_no: string;
  lines: ReceiptLine[];
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  payment?: ReceiptPayment | null;
  currency: string;
  minorUnits: number;
  /** Shown under the total, e.g. a stub-pack "not a tax invoice" note. */
  footer?: string | null;
  width?: number;
}

function receiptRows(data: ReceiptData): string[] {
  const width = data.width ?? DEFAULT_WIDTH;
  const money = (m: number) => formatMinor(m, data.currency, data.minorUnits);
  const out: string[] = [];

  if (data.branch_name) out.push(center(data.branch_name, width));
  out.push(center(data.order_no, width));
  out.push("-".repeat(width));

  for (const line of data.lines) {
    out.push(twoColumns(`${line.quantity} x ${line.name}`, money(line.line_total_minor), width));
    for (const mod of line.modifiers ?? []) out.push(`   + ${mod}`);
  }

  out.push("-".repeat(width));
  out.push(twoColumns("Subtotal", money(data.subtotal_minor), width));
  if (data.discount_minor > 0) out.push(twoColumns("Discount", `-${money(data.discount_minor)}`, width));
  out.push(twoColumns("Tax", money(data.tax_minor), width));
  out.push(twoColumns("TOTAL", money(data.total_minor), width));

  if (data.payment) {
    out.push("");
    out.push(twoColumns(data.payment.method, money(data.payment.amount_minor), width));
    if (data.payment.tendered_minor != null) {
      out.push(twoColumns("Tendered", money(data.payment.tendered_minor), width));
    }
    if (data.payment.change_minor != null && data.payment.change_minor > 0) {
      out.push(twoColumns("Change", money(data.payment.change_minor), width));
    }
  }

  if (data.footer) {
    out.push("");
    out.push(center(data.footer, width));
  }
  return out;
}

export function renderReceiptText(data: ReceiptData): string {
  return receiptRows(data).join("\n");
}

export function renderReceipt(data: ReceiptData): Uint8Array {
  const width = data.width ?? DEFAULT_WIDTH;
  const money = (m: number) => formatMinor(m, data.currency, data.minorUnits);
  const b = new EscPosBuilder().init();

  b.align("center");
  if (data.branch_name) b.bold(true).line(data.branch_name).bold(false);
  b.line(data.order_no);
  b.align("left").line("-".repeat(width));

  for (const line of data.lines) {
    b.line(twoColumns(`${line.quantity} x ${line.name}`, money(line.line_total_minor), width));
    for (const mod of line.modifiers ?? []) b.line(`   + ${mod}`);
  }

  b.line("-".repeat(width));
  b.line(twoColumns("Subtotal", money(data.subtotal_minor), width));
  if (data.discount_minor > 0) b.line(twoColumns("Discount", `-${money(data.discount_minor)}`, width));
  b.line(twoColumns("Tax", money(data.tax_minor), width));
  b.bold(true).line(twoColumns("TOTAL", money(data.total_minor), width)).bold(false);

  if (data.payment) {
    b.feed(1);
    b.line(twoColumns(data.payment.method, money(data.payment.amount_minor), width));
    if (data.payment.tendered_minor != null) {
      b.line(twoColumns("Tendered", money(data.payment.tendered_minor), width));
    }
    if (data.payment.change_minor != null && data.payment.change_minor > 0) {
      b.line(twoColumns("Change", money(data.payment.change_minor), width));
    }
  }

  if (data.footer) b.feed(1).align("center").line(data.footer);
  return b.cut().build();
}

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}
