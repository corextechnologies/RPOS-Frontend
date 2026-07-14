/** Super Admin Income DTOs — platform subscription money + restaurant acquisition. */

export type IncomeForecastHorizon = 1 | 6 | 12;

export type IncomePeriodFilter =
  | { month: string }
  | { from_date: string; to_date: string };

export interface IncomeAgingBucket {
  bucket: string;
  label: string;
  count: number;
  amount: string;
}

export interface IncomePlanTierRow {
  plan_tier: string;
  restaurant_count: number;
  collected: string;
  outstanding: string;
  restaurants_onboarded: number;
  mrr: string;
}

export interface IncomeDayPoint {
  date: string;
  collected: string;
  outstanding: string;
  restaurants_onboarded: number;
  invoice_count_paid: number;
  invoice_count_unpaid: number;
}

export interface IncomeMonthPoint {
  month: string;
  collected: string;
  outstanding: string;
  restaurants_onboarded: number;
  invoice_count_paid: number;
  invoice_count_unpaid: number;
}

export interface IncomeRestaurantRow {
  restaurant_id: string;
  restaurant_name: string;
  owner_contact_email: string | null;
  plan_tier: string | null;
  plan_amount: string | null;
  status: string;
  collected: string;
  outstanding: string;
  invoice_count_paid: number;
  invoice_count_unpaid: number;
  onboarded_on: string | null;
}

export interface IncomePlatformKpis {
  restaurants_active: number;
  restaurants_halted: number;
  restaurants_total: number;
  mrr: string;
  arr: string;
  mrr_lost_from_halted: string;
  collection_rate: string;
}

export interface IncomeCompare {
  previous_from_date: string;
  previous_to_date: string;
  previous_collected: string;
  previous_outstanding: string;
  previous_restaurants_onboarded: number;
  collected_change_pct: string | null;
  outstanding_change_pct: string | null;
  restaurants_onboarded_change_pct: string | null;
}

export interface IncomeSummary {
  from_date: string;
  to_date: string;
  total_collected: string;
  total_outstanding: string;
  invoice_count_paid: number;
  invoice_count_unpaid: number;
  restaurants_onboarded: number;
  collection_rate: string;
  platform: IncomePlatformKpis;
  compare: IncomeCompare;
  aging_unpaid: IncomeAgingBucket[];
  by_plan_tier: IncomePlanTierRow[];
  by_day: IncomeDayPoint[];
  by_month: IncomeMonthPoint[];
  by_restaurant: IncomeRestaurantRow[];
}

export interface IncomeForecastMonth {
  month: string;
  projected_restaurants_added: string;
  projected_collections: string;
  projected_mrr: string;
}

export interface IncomeForecast {
  horizon_months: number;
  lookback_months_used: number;
  avg_restaurants_onboarded_per_month: string;
  avg_plan_amount_recent: string;
  current_mrr: string;
  projected_restaurants_added_total: string;
  projected_collections_total: string;
  months: IncomeForecastMonth[];
}

export function incomeFilterQuery(filter: IncomePeriodFilter): string {
  if ("month" in filter) {
    return `month=${encodeURIComponent(filter.month)}`;
  }
  return `from_date=${encodeURIComponent(filter.from_date)}&to_date=${encodeURIComponent(filter.to_date)}`;
}

export function currentIncomeMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
