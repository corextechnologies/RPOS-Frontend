import type { IncomeForecast, IncomeSummary } from "@/lib/types/income";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { titleCase } from "@/lib/utils";

export interface IncomeInvoiceExportRow {
  restaurant_name: string;
  owner_email: string;
  plan: string;
  issued_on: string;
  amount: string;
  payment_status: "Paid" | "Unpaid";
  restaurant_status: string;
}

export interface IncomeOnboardingExportRow {
  restaurant_name: string;
  owner_email: string;
  plan: string;
  date_joined: string;
  restaurant_status: string;
}

export interface IncomeReportModel {
  from_date: string;
  to_date: string;
  total_collected: string;
  total_outstanding: string;
  mrr: string;
  arr: string;
  expected_6mo_revenue: string;
  restaurants_sold: number;
  collection_rate: string;
  invoices: IncomeInvoiceExportRow[];
  onboardings: IncomeOnboardingExportRow[];
}

function money(n: number): string {
  return n.toFixed(2);
}

function sumProjectedCollections(forecast: IncomeForecast | null | undefined): string {
  if (!forecast?.months?.length) return "0.00";
  const total = forecast.months.reduce((sum, m) => {
    const n = parseFloat(m.projected_collections);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  return money(total);
}

function restaurantStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Active";
  if (s === "HALTED") return "Halted";
  return titleCase(status);
}

export function buildIncomeReportModel(
  summary: IncomeSummary,
  forecast6: IncomeForecast | null | undefined,
  invoices: IncomeInvoiceExportRow[],
  onboardings?: IncomeOnboardingExportRow[],
): IncomeReportModel {
  const onboarded =
    onboardings ??
    summary.by_restaurant
      .filter((r) => {
        const joined = r.onboarded_on;
        if (!joined) return false;
        return joined >= summary.from_date && joined <= summary.to_date;
      })
      .map((r) => ({
        restaurant_name: r.restaurant_name,
        owner_email: r.owner_contact_email ?? "",
        plan: r.plan_tier ? titleCase(r.plan_tier) : "—",
        date_joined: r.onboarded_on ?? "",
        restaurant_status: restaurantStatusLabel(r.status),
      }));

  return {
    from_date: summary.from_date,
    to_date: summary.to_date,
    total_collected: summary.total_collected,
    total_outstanding: summary.total_outstanding,
    mrr: summary.platform.mrr,
    arr: summary.platform.arr,
    expected_6mo_revenue:
      forecast6?.projected_collections_total &&
      parseFloat(forecast6.projected_collections_total) > 0
        ? forecast6.projected_collections_total
        : sumProjectedCollections(forecast6),
    restaurants_sold: summary.restaurants_onboarded,
    collection_rate: summary.collection_rate,
    invoices,
    onboardings: onboarded,
  };
}

export function escapeCsvCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Backend-shaped multi-section CSV (no technical IDs). */
export function buildIncomeCsvReport(model: IncomeReportModel): string {
  const lines: string[] = [
    "Platform Income Report",
    `Period,${escapeCsvCell(`${model.from_date} to ${model.to_date}`)}`,
    "",
    "Summary",
    `Total payment received,${escapeCsvCell(model.total_collected)}`,
    `Outstanding payment,${escapeCsvCell(model.total_outstanding)}`,
    `MRR (Monthly Recurring Revenue),${escapeCsvCell(model.mrr)}`,
    `ARR (Annual Recurring Revenue),${escapeCsvCell(model.arr)}`,
    `Expected 6 months revenue,${escapeCsvCell(model.expected_6mo_revenue)}`,
    `Restaurants sold in period,${escapeCsvCell(model.restaurants_sold)}`,
    `Collection rate (%),${escapeCsvCell(model.collection_rate)}`,
    "",
    "Invoices",
    "Restaurant name,Owner email,Plan,Issued on,Amount,Payment status,Restaurant status",
    ...model.invoices.map((row) =>
      [
        row.restaurant_name,
        row.owner_email,
        row.plan,
        row.issued_on,
        row.amount,
        row.payment_status,
        row.restaurant_status,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    "New restaurants (onboardings)",
    "Restaurant name,Owner email,Plan,Date joined,Restaurant status",
    ...model.onboardings.map((row) =>
      [row.restaurant_name, row.owner_email, row.plan, row.date_joined, row.restaurant_status]
        .map(escapeCsvCell)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function moneyDisplay(amount: string): string {
  return `$${formatPlanAmount(amount)}`;
}

export { restaurantStatusLabel };
