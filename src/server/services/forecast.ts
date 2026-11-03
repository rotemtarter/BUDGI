import { addMonths } from "@/lib/dates/month";
import { addDays } from "@/lib/dates/week";
import { weeksInMonth } from "@/lib/dates/period";
import { lastDayOfMonth, monthRatio, monthShare, monthTotal, weeklySeries, type WeekPoint, type WeekRow } from "./metrics";

// Forecast Service (PRD 4.5, ARCHITECTURE.md 5.4, ADR-10): month-end forecast
// for spend, revenue, leads and deals, and the expected ROAS. Pure functions,
// no database.

export type ForecastField = "spend" | "revenue" | "leads" | "deals";
export type ForecastBasis = "pace" | "pace_and_history";

// Actual so far, the forecast (null for an ended month or when it cannot be
// calculated) and what it is based on
export type FieldForecast = {
  actual: number | null;
  forecast: number | null;
  basis: ForecastBasis | null;
  reason: string | null;
};

export const MIN_COVERED_DAYS = 7;
const HISTORY_MONTHS = 3;
const MIN_HISTORY_MONTHS = 2;
const PACE_WEIGHT = 0.7;

export const NOT_ENOUGH_DATA = "אין מספיק נתונים לתחזית";

const MISSING: Record<ForecastField, string> = {
  spend: "לא הוזנה הוצאה בחודש",
  revenue: "לא הוזנו הכנסות בחודש",
  leads: "לא הוזנו לידים בחודש",
  deals: "לא הוזנו עסקאות בחודש",
};

export function daysInMonth(month: string): number {
  return Number(lastDayOfMonth(month).slice(8, 10));
}

// Days of the month from its start to the end (Saturday) of the last week
// with data, at most the end of the month. 0 when no week has days in it.
export function coveredDays(rows: WeekRow[], month: string): number {
  const weeks = rows.filter((row) => monthShare(row.week_start, month) > 0).map((row) => row.week_start);
  if (weeks.length === 0) return 0;
  const lastWeek = weeks.sort()[weeks.length - 1];
  const end = [addDays(lastWeek, 6), lastDayOfMonth(month)].sort()[0];
  return Number(end.slice(8, 10));
}

// A month has complete data when every week with days in it has at least one
// row, of any campaign (user's decision, ADR-10)
export function isCompleteMonth(rows: WeekRow[], month: string): boolean {
  const withData = new Set(rows.map((row) => row.week_start));
  return weeksInMonth(month).every((week) => withData.has(week));
}

// Up to three calendar months before `month` that have complete data
export function historyMonths(rows: WeekRow[], month: string): string[] {
  return Array.from({ length: HISTORY_MONTHS }, (_, i) => addMonths(month, -(i + 1))).filter((m) =>
    isCompleteMonth(rows, m),
  );
}

// One field's month-end forecast:
//   pace = so far ÷ covered days × days in month
//   with 2+ complete previous months: 70% pace + 30% their average
// Never below what already happened (ADR-10).
export function fieldForecast(rows: WeekRow[], month: string, field: ForecastField): FieldForecast {
  const actual = monthTotal(rows, month, field);
  const covered = coveredDays(rows, month);
  if (covered < MIN_COVERED_DAYS) return { actual, forecast: null, basis: null, reason: NOT_ENOUGH_DATA };
  if (actual === null) return { actual, forecast: null, basis: null, reason: MISSING[field] };

  const pace = (actual / covered) * daysInMonth(month);
  const history = historyMonths(rows, month)
    .map((m) => monthTotal(rows, m, field))
    .filter((value): value is number => value !== null);

  if (history.length < MIN_HISTORY_MONTHS) {
    return { actual, forecast: Math.max(pace, actual), basis: "pace", reason: null };
  }
  const average = history.reduce((sum, value) => sum + value, 0) / history.length;
  const forecast = PACE_WEIGHT * pace + (1 - PACE_WEIGHT) * average;
  return { actual, forecast: Math.max(forecast, actual), basis: "pace_and_history", reason: null };
}

export type MonthForecast = {
  ended: boolean;
  coveredDays: number;
  daysInMonth: number;
  // At least 7 covered days (always true for an ended month)
  enough: boolean;
  spend: FieldForecast;
  revenue: FieldForecast;
  leads: FieldForecast;
  deals: FieldForecast;
  // Expected ROAS = expected revenue ÷ expected spend
  roas: FieldForecast;
};

// The month's forecast, or for an ended month the actual values only (PRD 4.5)
export function monthForecast(rows: WeekRow[], month: string, { ended }: { ended: boolean }): MonthForecast {
  const covered = coveredDays(rows, month);
  const roasActual = monthRatio(rows, month, "revenue", "spend");
  const base = { ended, coveredDays: covered, daysInMonth: daysInMonth(month) };

  if (ended) {
    const actualOnly = (field: ForecastField): FieldForecast => ({
      actual: monthTotal(rows, month, field),
      forecast: null,
      basis: null,
      reason: null,
    });
    return {
      ...base,
      enough: true,
      spend: actualOnly("spend"),
      revenue: actualOnly("revenue"),
      leads: actualOnly("leads"),
      deals: actualOnly("deals"),
      roas: { actual: roasActual, forecast: null, basis: null, reason: null },
    };
  }

  const spend = fieldForecast(rows, month, "spend");
  const revenue = fieldForecast(rows, month, "revenue");
  return {
    ...base,
    enough: covered >= MIN_COVERED_DAYS,
    spend,
    revenue,
    leads: fieldForecast(rows, month, "leads"),
    deals: fieldForecast(rows, month, "deals"),
    roas: { actual: roasActual, ...expectedRoas(spend, revenue) },
  };
}

function expectedRoas(spend: FieldForecast, revenue: FieldForecast): Omit<FieldForecast, "actual"> {
  if (spend.forecast === null || revenue.forecast === null) {
    return { forecast: null, basis: null, reason: spend.reason ?? revenue.reason };
  }
  if (spend.forecast === 0) return { forecast: null, basis: null, reason: "ההוצאה הצפויה היא 0" };
  const basis = spend.basis === "pace_and_history" && revenue.basis === "pace_and_history" ? "pace_and_history" : "pace";
  return { forecast: revenue.forecast / spend.forecast, basis, reason: null };
}

export type ForecastPoint = WeekPoint & { spendForecast: number | null; revenueForecast: number | null };

// Chart points for the month's weeks (DESIGN.md 1.8): the actual whole-week
// totals, and for the weeks after the last week with data the expected
// whole-week value (expected daily rate for the rest of the month × 7). The
// expected line starts at the last actual point so the two lines meet.
export function forecastSeries(rows: WeekRow[], month: string, forecast: MonthForecast): ForecastPoint[] {
  const weeks = weeksInMonth(month);
  const actual = weeklySeries(rows, weeks);
  const withData = new Set(rows.map((row) => row.week_start));
  const lastIndex = weeks.findLastIndex((week) => withData.has(week));
  const remainingDays = forecast.daysInMonth - forecast.coveredDays;

  const weekly = (field: FieldForecast): number | null => {
    if (forecast.ended || field.forecast === null || field.actual === null || remainingDays <= 0) return null;
    return ((field.forecast - field.actual) / remainingDays) * 7;
  };
  const spendWeekly = weekly(forecast.spend);
  const revenueWeekly = weekly(forecast.revenue);

  return actual.map((point, i) => {
    const expected = (perWeek: number | null, value: number | null) => {
      if (perWeek === null || lastIndex < 0 || i < lastIndex) return null;
      return i === lastIndex ? value : perWeek;
    };
    return {
      ...point,
      spendForecast: expected(spendWeekly, point.spend),
      revenueForecast: expected(revenueWeekly, point.revenue),
    };
  });
}
