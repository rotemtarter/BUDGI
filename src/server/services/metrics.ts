import { addMonths } from "@/lib/dates/month";
import { addDays } from "@/lib/dates/week";
import type { Period } from "@/lib/dates/period";

// Metrics Service (ARCHITECTURE.md 3.2, 5.3): split weeks into months and
// calculate totals, ratios, budget gaps and goal progress for a month or a
// week. Pure functions, no database.

export type WeekRow = {
  week_start: string;
  spend: number | null;
  leads: number | null;
  deals: number | null;
  new_customers: number | null;
  revenue: number | null;
};

type Field = keyof Omit<WeekRow, "week_start">;

export function lastDayOfMonth(month: string): string {
  return addDays(addMonths(month, 1), -1);
}

// Weeks that may have days inside `month`: from the Sunday up to 6 days before it
export function weeksRangeForMonth(month: string): { from: string; to: string } {
  return { from: addDays(month, -6), to: lastDayOfMonth(month) };
}

// Share of a week inside a month: days of the week in the month ÷ 7.
// Example: week 29.9–5.10 → 2/7 to September, 5/7 to October (PRD 4.3).
export function monthShare(weekStart: string, month: string): number {
  const first = month;
  const last = lastDayOfMonth(month);
  let days = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (day >= first && day <= last) days++;
  }
  return days / 7;
}

// Share of a week inside a period: for a month, its days in the month ÷ 7;
// for a week, the week itself (1) or nothing (0)
function periodShare(weekStart: string, period: Period): number {
  return period.kind === "month" ? monthShare(weekStart, period.month) : weekStart === period.weekStart ? 1 : 0;
}

function monthPeriod(month: string): Period {
  return { kind: "month", month };
}

// Sum of one field for the period, after splitting weeks between months.
// null when no week in the period has this field entered (not entered ≠ 0).
export function periodTotal(rows: WeekRow[], period: Period, field: Field): number | null {
  let total: number | null = null;
  for (const row of rows) {
    const share = periodShare(row.week_start, period);
    const value = row[field];
    if (share === 0 || value === null) continue;
    total = (total ?? 0) + Number(value) * share;
  }
  return total;
}

export function monthTotal(rows: WeekRow[], month: string, field: Field): number | null {
  return periodTotal(rows, monthPeriod(month), field);
}

// A calculated metric, or why it is not available (PRD 4.4, 4.8)
export type Metric = { value: number | null; reason: string | null };

const MISSING: Record<Field, string> = {
  spend: "לא הוזנה הוצאה בתקופה",
  leads: "לא הוזנו לידים בתקופה",
  deals: "לא הוזנו עסקאות בתקופה",
  new_customers: "לא הוזנו לקוחות חדשים בתקופה",
  revenue: "לא הוזנו הכנסות בתקופה",
};

const ZERO: Record<Field, string> = {
  spend: "ההוצאה בתקופה היא 0",
  leads: "מספר הלידים בתקופה הוא 0",
  deals: "מספר העסקאות בתקופה הוא 0",
  new_customers: "מספר הלקוחות החדשים בתקופה הוא 0",
  revenue: "ההכנסות בתקופה הן 0",
};

const NAMES: Record<Field, string> = {
  spend: "הוצאה",
  leads: "לידים",
  deals: "עסקאות",
  new_customers: "לקוחות חדשים",
  revenue: "הכנסות",
};

// numerator ÷ denominator for the period, only from weeks where both were
// entered. Not available when there are no such weeks or the denominator is 0.
export function periodRatio(rows: WeekRow[], period: Period, numerator: Field, denominator: Field): Metric {
  let top = 0;
  let bottom = 0;
  let any = false;
  let anyNumerator = false;
  let anyDenominator = false;
  for (const row of rows) {
    const share = periodShare(row.week_start, period);
    if (share === 0) continue;
    const n = row[numerator];
    const d = row[denominator];
    if (n !== null) anyNumerator = true;
    if (d !== null) anyDenominator = true;
    if (n === null || d === null) continue;
    top += Number(n) * share;
    bottom += Number(d) * share;
    any = true;
  }
  if (!any) {
    const reason = !anyDenominator
      ? MISSING[denominator]
      : !anyNumerator
        ? MISSING[numerator]
        : `לא הוזנו ${NAMES[numerator]} ו${NAMES[denominator]} באותם שבועות`;
    return { value: null, reason };
  }
  if (bottom === 0) return { value: null, reason: ZERO[denominator] };
  return { value: top / bottom, reason: null };
}

export function monthRatio(
  rows: WeekRow[],
  month: string,
  numerator: Field,
  denominator: Field,
): number | null {
  return periodRatio(rows, monthPeriod(month), numerator, denominator).value;
}

export type MonthSummary = {
  spend: number | null;
  leads: number | null;
  deals: number | null;
  newCustomers: number | null;
  revenue: number | null;
  cpl: number | null;
  costPerDeal: number | null;
  cac: number | null;
  roas: number | null;
};

export function monthSummary(rows: WeekRow[], month: string): MonthSummary {
  return {
    spend: monthTotal(rows, month, "spend"),
    leads: monthTotal(rows, month, "leads"),
    deals: monthTotal(rows, month, "deals"),
    newCustomers: monthTotal(rows, month, "new_customers"),
    revenue: monthTotal(rows, month, "revenue"),
    cpl: monthRatio(rows, month, "spend", "leads"),
    costPerDeal: monthRatio(rows, month, "spend", "deals"),
    cac: monthRatio(rows, month, "spend", "new_customers"),
    roas: monthRatio(rows, month, "revenue", "spend"),
  };
}

// Change against the previous period, in percent. null when either value is
// missing or the previous value is 0.
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// planned − actual; null when either is missing (missing spend is not 0)
export function remainingBudget(planned: number | null, spend: number | null): number | null {
  if (planned === null || spend === null) return null;
  return planned - spend;
}

export type PeriodSummary = {
  spend: number | null;
  leads: number | null;
  deals: number | null;
  newCustomers: number | null;
  revenue: number | null;
  cpl: Metric;
  costPerDeal: Metric;
  cac: Metric;
  roas: Metric;
  // Deals ÷ leads, in percent
  conversionRate: Metric;
};

export function periodSummary(rows: WeekRow[], period: Period): PeriodSummary {
  const conversion = periodRatio(rows, period, "deals", "leads");
  return {
    spend: periodTotal(rows, period, "spend"),
    leads: periodTotal(rows, period, "leads"),
    deals: periodTotal(rows, period, "deals"),
    newCustomers: periodTotal(rows, period, "new_customers"),
    revenue: periodTotal(rows, period, "revenue"),
    cpl: periodRatio(rows, period, "spend", "leads"),
    costPerDeal: periodRatio(rows, period, "spend", "deals"),
    cac: periodRatio(rows, period, "spend", "new_customers"),
    roas: periodRatio(rows, period, "revenue", "spend"),
    conversionRate: { ...conversion, value: conversion.value === null ? null : conversion.value * 100 },
  };
}

// True when at least one week in the period has data
export function hasPeriodData(rows: WeekRow[], period: Period): boolean {
  return rows.some((row) => periodShare(row.week_start, period) > 0);
}

// Total monthly budget − the sum of the campaigns' budgets for the month
// (PRD 4.2, gap 1). Campaigns without a budget are not counted. Negative =
// more was allocated than the total budget.
export function budgetGap(total: number | null, campaignBudgets: (number | null)[]): number | null {
  if (total === null) return null;
  return total - allocatedBudget(campaignBudgets);
}

export function allocatedBudget(campaignBudgets: (number | null)[]): number {
  return campaignBudgets.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
}

// Actual ÷ goal, in percent. null when there is no goal (or it is 0) or no actual value.
export function goalProgress(actual: number | null, target: number | null): number | null {
  if (actual === null || target === null || target === 0) return null;
  return (actual / target) * 100;
}

export type WeekPoint = { weekStart: string; spend: number | null; revenue: number | null };

// One point per week for the charts: the whole week's totals across campaigns
// (not split between months). A week without a value is null, a gap in the line.
export function weeklySeries(rows: WeekRow[], weeks: string[]): WeekPoint[] {
  return weeks.map((weekStart) => {
    const period: Period = { kind: "week", weekStart };
    return { weekStart, spend: periodTotal(rows, period, "spend"), revenue: periodTotal(rows, period, "revenue") };
  });
}
