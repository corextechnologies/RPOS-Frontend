/**
 * Derive Super Admin income summary/forecast from mock restaurants + invoices.
 */
import type {
  IncomeDayPoint,
  IncomeForecast,
  IncomeForecastHorizon,
  IncomeMonthPoint,
  IncomePeriodFilter,
  IncomeSummary,
} from "@/lib/types/income";
import type { Restaurant } from "@/lib/types/super-admin";
import {
  buildIncomeCsvReport,
  buildIncomeReportModel,
} from "@/lib/income/report-model";
import { titleCase } from "@/lib/utils";

interface InvoiceLike {
  id: number;
  restaurant_id: string;
  amount: string;
  issued_on: string;
  paid: boolean;
}

function toLocalYmd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime()) && iso.includes("T")) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return iso.slice(0, 10);
}

function money(n: number): string {
  return n.toFixed(2);
}

function parseAmount(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function resolveRange(filter: IncomePeriodFilter): { from: string; to: string } {
  if ("month" in filter) {
    const [y, m] = filter.month.split("-").map(Number);
    const from = `${filter.month}-01`;
    const last = new Date(y, m, 0).getDate();
    const to = `${filter.month}-${String(last).padStart(2, "0")}`;
    return { from, to };
  }
  return { from: filter.from_date, to: filter.to_date };
}

function previousRange(from: string, to: string): { from: string; to: string } {
  const len = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -len);
  return { from: prevFrom, to: prevTo };
}

function changePct(current: number, previous: number): string | null {
  if (previous === 0) return current === 0 ? "0.00" : null;
  return (((current - previous) / previous) * 100).toFixed(2);
}

function periodStats(
  restaurants: Restaurant[],
  invoices: InvoiceLike[],
  from: string,
  to: string,
) {
  const periodInvoices = invoices.filter((i) => i.issued_on >= from && i.issued_on <= to);
  let collected = 0;
  let outstanding = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  for (const inv of periodInvoices) {
    const amt = parseAmount(inv.amount);
    if (inv.paid) {
      collected += amt;
      paidCount += 1;
    } else {
      outstanding += amt;
      unpaidCount += 1;
    }
  }
  const onboarded = restaurants.filter((r) => {
    const created = toLocalYmd(r.created_at);
    return created && created >= from && created <= to;
  }).length;
  return { collected, outstanding, paidCount, unpaidCount, onboarded, periodInvoices };
}

export function buildMockIncomeSummary(
  restaurants: Restaurant[],
  invoices: InvoiceLike[],
  filter: IncomePeriodFilter,
): IncomeSummary {
  const { from, to } = resolveRange(filter);
  const current = periodStats(restaurants, invoices, from, to);
  const prev = previousRange(from, to);
  const previous = periodStats(restaurants, invoices, prev.from, prev.to);

  const active = restaurants.filter((r) => r.plan_status === "active");
  const halted = restaurants.filter((r) => r.plan_status === "halted");
  const mrr = active.reduce((sum, r) => sum + parseAmount(String(r.plan_amount ?? 0)), 0);
  const mrrLost = halted.reduce((sum, r) => sum + parseAmount(String(r.plan_amount ?? 0)), 0);
  const denom = current.collected + current.outstanding;
  const collectionRate = denom === 0 ? 0 : (current.collected / denom) * 100;

  const byDay: IncomeDayPoint[] = eachDay(from, to).map((date) => {
    const dayInvs = invoices.filter((i) => i.issued_on === date);
    let collected = 0;
    let outstanding = 0;
    let paid = 0;
    let unpaid = 0;
    for (const inv of dayInvs) {
      const amt = parseAmount(inv.amount);
      if (inv.paid) {
        collected += amt;
        paid += 1;
      } else {
        outstanding += amt;
        unpaid += 1;
      }
    }
    const onboarded = restaurants.filter((r) => toLocalYmd(r.created_at) === date).length;
    return {
      date,
      collected: money(collected),
      outstanding: money(outstanding),
      restaurants_onboarded: onboarded,
      invoice_count_paid: paid,
      invoice_count_unpaid: unpaid,
    };
  });

  const monthMap = new Map<
    string,
    { collected: number; outstanding: number; onboarded: number; paid: number; unpaid: number }
  >();
  for (const day of byDay) {
    const key = monthKey(day.date);
    const row = monthMap.get(key) ?? {
      collected: 0,
      outstanding: 0,
      onboarded: 0,
      paid: 0,
      unpaid: 0,
    };
    row.collected += parseAmount(day.collected);
    row.outstanding += parseAmount(day.outstanding);
    row.onboarded += day.restaurants_onboarded;
    row.paid += day.invoice_count_paid;
    row.unpaid += day.invoice_count_unpaid;
    monthMap.set(key, row);
  }
  const by_month: IncomeMonthPoint[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, row]) => ({
      month,
      collected: money(row.collected),
      outstanding: money(row.outstanding),
      restaurants_onboarded: row.onboarded,
      invoice_count_paid: row.paid,
      invoice_count_unpaid: row.unpaid,
    }));

  const tierMap = new Map<
    string,
    {
      restaurant_count: number;
      collected: number;
      outstanding: number;
      onboarded: number;
      mrr: number;
    }
  >();
  for (const r of restaurants) {
    const tier = String(r.plan_tier || "standard");
    const row = tierMap.get(tier) ?? {
      restaurant_count: 0,
      collected: 0,
      outstanding: 0,
      onboarded: 0,
      mrr: 0,
    };
    row.restaurant_count += 1;
    if (r.plan_status === "active") row.mrr += parseAmount(String(r.plan_amount ?? 0));
    const created = toLocalYmd(r.created_at);
    if (created && created >= from && created <= to) row.onboarded += 1;
    for (const inv of current.periodInvoices.filter((i) => i.restaurant_id === r.id)) {
      const amt = parseAmount(inv.amount);
      if (inv.paid) row.collected += amt;
      else row.outstanding += amt;
    }
    tierMap.set(tier, row);
  }

  const today = new Date().toISOString().slice(0, 10);
  const aging = [
    { bucket: "0_30", label: "0–30 days", count: 0, amount: 0 },
    { bucket: "31_60", label: "31–60 days", count: 0, amount: 0 },
    { bucket: "61_plus", label: "61+ days", count: 0, amount: 0 },
  ];
  for (const inv of invoices.filter((i) => !i.paid)) {
    const age = daysBetween(inv.issued_on, today);
    const amt = parseAmount(inv.amount);
    const idx = age <= 30 ? 0 : age <= 60 ? 1 : 2;
    aging[idx].count += 1;
    aging[idx].amount += amt;
  }

  return {
    from_date: from,
    to_date: to,
    total_collected: money(current.collected),
    total_outstanding: money(current.outstanding),
    invoice_count_paid: current.paidCount,
    invoice_count_unpaid: current.unpaidCount,
    restaurants_onboarded: current.onboarded,
    collection_rate: money(collectionRate),
    platform: {
      restaurants_active: active.length,
      restaurants_halted: halted.length,
      restaurants_total: restaurants.length,
      mrr: money(mrr),
      arr: money(mrr * 12),
      mrr_lost_from_halted: money(mrrLost),
      collection_rate: money(collectionRate),
    },
    compare: {
      previous_from_date: prev.from,
      previous_to_date: prev.to,
      previous_collected: money(previous.collected),
      previous_outstanding: money(previous.outstanding),
      previous_restaurants_onboarded: previous.onboarded,
      collected_change_pct: changePct(current.collected, previous.collected),
      outstanding_change_pct: changePct(current.outstanding, previous.outstanding),
      restaurants_onboarded_change_pct: changePct(current.onboarded, previous.onboarded),
    },
    aging_unpaid: aging.map((b) => ({
      bucket: b.bucket,
      label: b.label,
      count: b.count,
      amount: money(b.amount),
    })),
    by_plan_tier: [...tierMap.entries()].map(([plan_tier, row]) => ({
      plan_tier,
      restaurant_count: row.restaurant_count,
      collected: money(row.collected),
      outstanding: money(row.outstanding),
      restaurants_onboarded: row.onboarded,
      mrr: money(row.mrr),
    })),
    by_day: byDay,
    by_month,
    by_restaurant: restaurants.map((r) => {
      const rows = current.periodInvoices.filter((i) => i.restaurant_id === r.id);
      let collected = 0;
      let outstanding = 0;
      let paid = 0;
      let unpaid = 0;
      for (const inv of rows) {
        const amt = parseAmount(inv.amount);
        if (inv.paid) {
          collected += amt;
          paid += 1;
        } else {
          outstanding += amt;
          unpaid += 1;
        }
      }
      return {
        restaurant_id: r.id,
        restaurant_name: r.name,
        owner_contact_email: r.admin.email || null,
        plan_tier: String(r.plan_tier),
        plan_amount: r.plan_amount != null ? String(r.plan_amount) : null,
        status: r.plan_status === "active" ? "ACTIVE" : "HALTED",
        collected: money(collected),
        outstanding: money(outstanding),
        invoice_count_paid: paid,
        invoice_count_unpaid: unpaid,
        onboarded_on: toLocalYmd(r.created_at),
      };
    }),
  };
}

export function buildMockIncomeForecast(
  restaurants: Restaurant[],
  horizon: IncomeForecastHorizon,
): IncomeForecast {
  const active = restaurants.filter((r) => r.plan_status === "active");
  const currentMrr = active.reduce((sum, r) => sum + parseAmount(String(r.plan_amount ?? 0)), 0);
  const avgPlan =
    active.length === 0
      ? 199
      : active.reduce((sum, r) => sum + parseAmount(String(r.plan_amount ?? 0)), 0) / active.length;
  const lookback = Math.min(6, horizon);
  const avgOnboarded = Math.max(0.5, restaurants.length / Math.max(lookback, 1));
  const months: IncomeForecast["months"] = [];
  let mrr = currentMrr;
  const start = new Date();
  start.setDate(1);
  for (let i = 1; i <= horizon; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    mrr += avgOnboarded * avgPlan;
    months.push({
      month,
      projected_restaurants_added: avgOnboarded.toFixed(2),
      projected_collections: money(mrr),
      projected_mrr: money(mrr),
    });
  }
  const projectedCollectionsTotal = months.reduce(
    (sum, m) => sum + parseAmount(m.projected_collections),
    0,
  );
  return {
    horizon_months: horizon,
    lookback_months_used: lookback,
    avg_restaurants_onboarded_per_month: avgOnboarded.toFixed(2),
    avg_plan_amount_recent: money(avgPlan),
    current_mrr: money(currentMrr),
    projected_restaurants_added_total: (avgOnboarded * horizon).toFixed(2),
    projected_collections_total: money(projectedCollectionsTotal),
    months,
  };
}

export function buildMockInvoiceExportRows(
  restaurants: Restaurant[],
  invoices: InvoiceLike[],
  from: string,
  to: string,
) {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  return invoices
    .filter((i) => i.issued_on >= from && i.issued_on <= to)
    .sort((a, b) => b.issued_on.localeCompare(a.issued_on))
    .map((inv) => {
      const r = byId.get(inv.restaurant_id);
      return {
        restaurant_name: r?.name ?? "Unknown",
        owner_email: r?.admin.email ?? "",
        plan: r?.plan_tier ? titleCase(String(r.plan_tier)) : "—",
        issued_on: inv.issued_on,
        amount: inv.amount,
        payment_status: (inv.paid ? "Paid" : "Unpaid") as "Paid" | "Unpaid",
        restaurant_status: r?.plan_status === "active" ? "Active" : "Halted",
      };
    });
}

export function buildMockIncomeCsv(
  summary: IncomeSummary,
  forecast6: IncomeForecast,
  restaurants: Restaurant[],
  invoices: InvoiceLike[],
): string {
  const invoiceRows = buildMockInvoiceExportRows(
    restaurants,
    invoices,
    summary.from_date,
    summary.to_date,
  );
  const model = buildIncomeReportModel(summary, forecast6, invoiceRows);
  return buildIncomeCsvReport(model);
}
