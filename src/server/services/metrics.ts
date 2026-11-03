import { addMonths } from "@/lib/dates/month";
import { addDays } from "@/lib/dates/week";

// Metrics Service, first part (ARCHITECTURE.md 3.2, 5.3): split weeks into
// months and calculate monthly totals and ratios. Pure functions, no database.
// Extended in Milestone 5 (weeks, goals, budget gaps).

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

// Sum of one field for the month after splitting. null when no week in the
// month has this field entered (not entered ≠ 0).
export function monthTotal(rows: WeekRow[], month: string, field: Field): number | null {
  let total: number | null = null;
  for (const row of rows) {
    const share = monthShare(row.week_start, month);
    const value = row[field];
    if (share === 0 || value === null) continue;
    total = (total ?? 0) + Number(value) * share;
  }
  return total;
}

// numerator ÷ denominator for the month, only from weeks where both were
// entered. null when there are no such weeks or the denominator is 0 (PRD 4.4).
export function monthRatio(
  rows: WeekRow[],
  month: string,
  numerator: Field,
  denominator: Field,
): number | null {
  let top = 0;
  let bottom = 0;
  let any = false;
  for (const row of rows) {
    const share = monthShare(row.week_start, month);
    const n = row[numerator];
    const d = row[denominator];
    if (share === 0 || n === null || d === null) continue;
    top += Number(n) * share;
    bottom += Number(d) * share;
    any = true;
  }
  if (!any || bottom === 0) return null;
  return top / bottom;
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
