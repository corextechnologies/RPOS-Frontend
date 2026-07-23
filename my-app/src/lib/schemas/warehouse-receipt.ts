import type { WarehouseRequestLineItem } from "@/lib/types/warehouse";

/** One editable row in the receipts editor, keyed by `line_items[].id`. */
export interface ReceiptDraft {
  line_item_id: string;
  quantity_received: string;
  batch_code: string;
  expiry_date: string;
  issue_note: string;
}

/**
 * The cap for a line: you can never receive more than Admin approved.
 *
 * Falls back to the requested quantity for a PO that somehow has no approval —
 * the server applies the same rule, and a missing cap must not read as zero.
 */
export function lineCap(line: WarehouseRequestLineItem): number {
  return line.quantity_approved ?? line.quantity_requested;
}

/**
 * Seed one draft per line.
 *
 * Quantities default to what is already recorded: on the re-enqueue path the
 * line already carries the reported total, and `quantity_received` at RECEIVED
 * is the CUMULATIVE total for the order — not the top-up that just arrived. So
 * the sensible default is the full cap, and the previously reported figure is
 * shown alongside for contrast.
 */
export function seedReceiptDrafts(
  lines: WarehouseRequestLineItem[],
): ReceiptDraft[] {
  return lines.map((line) => ({
    line_item_id: line.id,
    quantity_received: String(lineCap(line)),
    batch_code: "",
    expiry_date: "",
    issue_note: line.issue_note ?? "",
  }));
}

export interface ReceiptValidation {
  /** Rows whose quantity is not a number within 0..cap (fractions allowed). */
  invalid: ReceiptDraft[];
  /** True when any quantity is short, or any issue note was written. */
  differs: boolean;
}

export function validateReceipts(
  drafts: ReceiptDraft[],
  lines: WarehouseRequestLineItem[],
): ReceiptValidation {
  const byId = new Map(lines.map((line) => [line.id, line]));
  const invalid: ReceiptDraft[] = [];
  let differs = false;

  for (const draft of drafts) {
    const line = byId.get(draft.line_item_id);
    if (!line) continue;
    const cap = lineCap(line);
    const value = Number(draft.quantity_received);
    const ok =
      draft.quantity_received.trim() !== "" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= cap;
    if (!ok) invalid.push(draft);
    if (ok && value !== cap) differs = true;
    if (draft.issue_note.trim()) differs = true;
  }

  return { invalid, differs };
}
