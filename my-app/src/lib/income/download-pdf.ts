import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { IncomeReportModel } from "@/lib/income/report-model";
import { moneyDisplay } from "@/lib/income/report-model";

type RGB = [number, number, number];

const BRAND: RGB = [20, 168, 140];
const BRAND_STRONG: RGB = [0, 71, 65];
const WARN: RGB = [217, 119, 6];
const POSITIVE: RGB = [4, 120, 87];
const MUTED: RGB = [74, 92, 86];
const LINE: RGB = [214, 208, 192];
const CONTENT: RGB = [11, 31, 27];
const SURFACE: RGB = [251, 250, 246];
const SURFACE_2: RGB = [245, 242, 234];

function rateLabel(value: string): string {
  const n = parseFloat(value);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : `${value}%`;
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  accent: RGB,
) {
  doc.setFillColor(...SURFACE_2);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, w, h, 3, 3, "FD");

  doc.setFillColor(...accent);
  doc.rect(x, y, 2.2, h, "F");

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(label.toUpperCase(), x + 6, y + 8);

  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(value, x + 6, y + 18, { maxWidth: w - 10 });
}

export function downloadIncomePdfReport(model: IncomeReportModel): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFillColor(...SURFACE);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), "F");

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RESTAURANT OS  ·  SUPER ADMIN", margin, y);

  y += 8;
  doc.setTextColor(...CONTENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Platform Income Report", margin, y);

  y += 7;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Period ${model.from_date} to ${model.to_date}`, margin, y);

  y += 10;
  const gap = 4;
  const colW = (pageW - margin * 2 - gap * 2) / 3;
  const cardH = 24;
  const kpis: Array<{ label: string; value: string; accent: RGB }> = [
    { label: "Total payment received", value: moneyDisplay(model.total_collected), accent: POSITIVE },
    { label: "Outstanding payment", value: moneyDisplay(model.total_outstanding), accent: WARN },
    { label: "MRR", value: moneyDisplay(model.mrr), accent: BRAND },
    { label: "ARR", value: moneyDisplay(model.arr), accent: BRAND_STRONG },
    {
      label: "Expected 6 months revenue",
      value: moneyDisplay(model.expected_6mo_revenue),
      accent: BRAND,
    },
    { label: "Restaurants sold", value: String(model.restaurants_sold), accent: BRAND },
    { label: "Collection rate", value: rateLabel(model.collection_rate), accent: POSITIVE },
  ];

  kpis.forEach((kpi, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    // 7th KPI spans centering in last row first column layout — place normally
    const x = margin + col * (colW + gap);
    const yy = y + row * (cardH + gap);
    drawKpiCard(doc, x, yy, colW, cardH, kpi.label, kpi.value, kpi.accent);
  });

  y += Math.ceil(kpis.length / 3) * (cardH + gap) + 6;

  doc.setTextColor(...CONTENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Invoices", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Restaurant name",
        "Owner email",
        "Plan",
        "Issued on",
        "Amount",
        "Payment status",
        "Restaurant status",
      ],
    ],
    body:
      model.invoices.length > 0
        ? model.invoices.map((r) => [
            r.restaurant_name,
            r.owner_email || "—",
            r.plan,
            r.issued_on,
            moneyDisplay(r.amount),
            r.payment_status,
            r.restaurant_status,
          ])
        : [["No invoices for this period", "", "", "", "", "", ""]],
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: CONTENT,
      lineColor: LINE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: SURFACE_2,
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: SURFACE },
    theme: "grid",
  });

  const afterInvoices =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20;
  y = afterInvoices + 10;

  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 16;
  }

  doc.setTextColor(...CONTENT);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("New restaurants (onboardings)", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Restaurant name", "Owner email", "Plan", "Date joined", "Restaurant status"]],
    body:
      model.onboardings.length > 0
        ? model.onboardings.map((r) => [
            r.restaurant_name,
            r.owner_email || "—",
            r.plan,
            r.date_joined,
            r.restaurant_status,
          ])
        : [["No new restaurants for this period", "", "", "", ""]],
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      textColor: CONTENT,
      lineColor: LINE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: SURFACE_2,
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: SURFACE },
    theme: "grid",
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Generated from Super Admin Income · synced with selected period filters",
      margin,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, doc.internal.pageSize.getHeight() - 8, {
      align: "right",
    });
  }

  const filename = `income-report-${model.from_date}_${model.to_date}.pdf`;
  doc.save(filename);
}
