import { jsPDF } from "jspdf";
import type { KitchenLabel } from "@/lib/types/kitchen";

/**
 * Expiry stickers, laid out as a printable sheet.
 *
 * The backend returns label data only — rendering and printing is entirely the
 * frontend's job, so this is where the sticker design lives.
 *
 * A5 landscape at 2 x 4 gives stickers big enough to read across a kitchen. The
 * geometry is all derived from PAGE/GRID below; change those, not the loop.
 */
const PAGE = { width: 210, height: 148, margin: 8 } as const;
const GRID = { cols: 2, rows: 4, gap: 4 } as const;

const CONTENT: [number, number, number] = [11, 31, 27];
const MUTED: [number, number, number] = [74, 92, 86];
const LINE: [number, number, number] = [214, 208, 192];
const BRAND: [number, number, number] = [20, 168, 140];

const CELL_WIDTH =
  (PAGE.width - PAGE.margin * 2 - GRID.gap * (GRID.cols - 1)) / GRID.cols;
const CELL_HEIGHT =
  (PAGE.height - PAGE.margin * 2 - GRID.gap * (GRID.rows - 1)) / GRID.rows;
const PER_PAGE = GRID.cols * GRID.rows;

function drawLabel(doc: jsPDF, label: KitchenLabel, x: number, y: number) {
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, CELL_WIDTH, CELL_HEIGHT, 2, 2, "D");

  // Accent stripe doubles as a tear guide.
  doc.setFillColor(...BRAND);
  doc.rect(x, y, 1.8, CELL_HEIGHT, "F");

  const textX = x + 6;

  doc.setTextColor(...CONTENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  // Long product names would otherwise run off the sticker.
  const name = doc.splitTextToSize(label.product_name, CELL_WIDTH - 12) as string[];
  doc.text(name.slice(0, 2), textX, y + 8);

  const afterName = y + 8 + Math.min(name.length, 2) * 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  if (label.sku) doc.text(`SKU ${label.sku}`, textX, afterName + 1);

  doc.setFontSize(9);
  doc.setTextColor(...CONTENT);
  // "No batch" rather than a blank line: a sticker with a gap looks misprinted.
  doc.text(
    `Batch: ${label.batch_code || "No batch"}`,
    textX,
    afterName + 7,
  );
  doc.text(`Qty: ${label.quantity}`, textX, afterName + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    label.expiry_date ? `Expires ${label.expiry_date}` : "No expiry date",
    textX,
    y + CELL_HEIGHT - 5,
  );
}

/** Opens the browser print dialog with a sticker sheet for `labels`. */
export function printKitchenLabels(labels: KitchenLabel[]) {
  if (labels.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });

  labels.forEach((label, index) => {
    if (index > 0 && index % PER_PAGE === 0) doc.addPage();

    const slot = index % PER_PAGE;
    const col = slot % GRID.cols;
    const row = Math.floor(slot / GRID.cols);
    const x = PAGE.margin + col * (CELL_WIDTH + GRID.gap);
    const y = PAGE.margin + row * (CELL_HEIGHT + GRID.gap);

    drawLabel(doc, label, x, y);
  });

  doc.autoPrint();
  // A blob URL in a new tab beats doc.save(): the user gets the print dialog
  // rather than a file in Downloads they then have to find and open.
  window.open(doc.output("bloburl"), "_blank");
}
