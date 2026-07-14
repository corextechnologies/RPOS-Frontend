"use client";

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import {
  buildIncomeReportModel,
  buildIncomeCsvReport,
  type IncomeInvoiceExportRow,
  type IncomeOnboardingExportRow,
} from "@/lib/income/report-model";
import type {
  IncomeForecast,
  IncomeForecastHorizon,
  IncomePeriodFilter,
  IncomeSummary,
} from "@/lib/types/income";
import { titleCase } from "@/lib/utils";

export function useIncomeSummary(filter: IncomePeriodFilter) {
  return useQuery({
    queryKey: queryKeys.incomeSummary(filter),
    queryFn: () => api.getIncomeSummary(filter),
  });
}

export function useIncomeForecast(horizon: IncomeForecastHorizon) {
  return useQuery({
    queryKey: queryKeys.incomeForecast(horizon),
    queryFn: () => api.getIncomeForecast(horizon),
  });
}

function triggerBlobDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function periodFilename(filter: IncomePeriodFilter, ext: string) {
  return (
    (`month` in filter
      ? `income-${filter.month}`
      : `income-${filter.from_date}_${filter.to_date}`) + `.${ext}`
  );
}

/** Try to parse invoice/onboarding tables from backend multi-section CSV. */
export function parseIncomeCsvTables(csv: string): {
  invoices: IncomeInvoiceExportRow[];
  onboardings: IncomeOnboardingExportRow[];
} {
  const lines = csv.split(/\r?\n/);
  const invoices: IncomeInvoiceExportRow[] = [];
  const onboardings: IncomeOnboardingExportRow[] = [];
  let section: "none" | "invoices" | "onboardings" = "none";
  let sawHeader = false;

  const splitCsv = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^invoices$/i.test(line)) {
      section = "invoices";
      sawHeader = false;
      continue;
    }
    if (/^new restaurants/i.test(line)) {
      section = "onboardings";
      sawHeader = false;
      continue;
    }
    if (/^(platform income report|summary|period[, ])/i.test(line)) {
      section = "none";
      continue;
    }
    if (section === "none") continue;
    const cells = splitCsv(line);
    if (!sawHeader) {
      sawHeader = true;
      continue;
    }
    if (section === "invoices" && cells.length >= 7) {
      const status = cells[5].trim().toLowerCase();
      invoices.push({
        restaurant_name: cells[0],
        owner_email: cells[1],
        plan: cells[2],
        issued_on: cells[3],
        amount: cells[4],
        payment_status: status === "paid" ? "Paid" : "Unpaid",
        restaurant_status: cells[6],
      });
    }
    if (section === "onboardings" && cells.length >= 5) {
      onboardings.push({
        restaurant_name: cells[0],
        owner_email: cells[1],
        plan: cells[2],
        date_joined: cells[3],
        restaurant_status: cells[4],
      });
    }
  }

  return { invoices, onboardings };
}

async function resolveExportTables(
  filter: IncomePeriodFilter,
  summary: IncomeSummary,
): Promise<{
  invoices: IncomeInvoiceExportRow[];
  onboardings: IncomeOnboardingExportRow[];
}> {
  try {
    const csv = await api.downloadIncomeCsv(filter);
    const parsed = parseIncomeCsvTables(csv);
    if (parsed.invoices.length > 0 || parsed.onboardings.length > 0) {
      return parsed;
    }
  } catch {
    // fall through
  }

  return {
    invoices: [],
    onboardings: summary.by_restaurant
      .filter((r) => {
        const joined = r.onboarded_on;
        return !!joined && joined >= summary.from_date && joined <= summary.to_date;
      })
      .map((r) => ({
        restaurant_name: r.restaurant_name,
        owner_email: r.owner_contact_email ?? "",
        plan: r.plan_tier ? titleCase(r.plan_tier) : "—",
        date_joined: r.onboarded_on ?? "",
        restaurant_status: r.status === "ACTIVE" ? "Active" : "Halted",
      })),
  };
}

export async function downloadIncomeStyledReport(
  filter: IncomePeriodFilter,
  summary?: IncomeSummary,
  forecast6?: IncomeForecast,
) {
  const [resolvedSummary, resolvedForecast] = await Promise.all([
    summary ? Promise.resolve(summary) : api.getIncomeSummary(filter),
    forecast6 && forecast6.horizon_months === 6
      ? Promise.resolve(forecast6)
      : api.getIncomeForecast(6),
  ]);
  const tables = await resolveExportTables(filter, resolvedSummary);
  const model = buildIncomeReportModel(
    resolvedSummary,
    resolvedForecast,
    tables.invoices,
    tables.onboardings.length ? tables.onboardings : undefined,
  );
  // Lazy-load the PDF generator (jspdf) only when a report is actually exported,
  // so it stays out of the eager bundle for every page that imports this hook.
  const { downloadIncomePdfReport } = await import("@/lib/income/download-pdf");
  downloadIncomePdfReport(model);
}

export async function downloadIncomeCsvFile(filter: IncomePeriodFilter, filename?: string) {
  const csv = await api.downloadIncomeCsv(filter);
  triggerBlobDownload(csv, filename ?? periodFilename(filter, "csv"), "text/csv;charset=utf-8");
}

/** Prefer backend CSV when it matches the new report shape; otherwise rebuild client-side. */
export async function downloadIncomeCsvReport(
  filter: IncomePeriodFilter,
  summary?: IncomeSummary,
  forecast6?: IncomeForecast,
) {
  try {
    const csv = await api.downloadIncomeCsv(filter);
    if (/Platform Income Report/i.test(csv) && /Total payment received/i.test(csv)) {
      triggerBlobDownload(csv, periodFilename(filter, "csv"), "text/csv;charset=utf-8");
      return;
    }
  } catch {
    // rebuild below
  }

  const [resolvedSummary, resolvedForecast] = await Promise.all([
    summary ? Promise.resolve(summary) : api.getIncomeSummary(filter),
    forecast6 && forecast6.horizon_months === 6
      ? Promise.resolve(forecast6)
      : api.getIncomeForecast(6),
  ]);
  const tables = await resolveExportTables(filter, resolvedSummary);
  const model = buildIncomeReportModel(
    resolvedSummary,
    resolvedForecast,
    tables.invoices,
    tables.onboardings.length ? tables.onboardings : undefined,
  );
  triggerBlobDownload(
    buildIncomeCsvReport(model),
    periodFilename(filter, "csv"),
    "text/csv;charset=utf-8",
  );
}
