import { addMonths, currentMonth, formatMonthLabel } from "./month";
import { addDays, formatWeekRange, isDateString, startOfWeek, today } from "./week";

// The period picked on the home and metrics screens: a month or a week
// (PRD 4.2). Kept in the URL as ?period=month&value=2026-10 or
// ?period=week&value=2026-10-25 (ARCHITECTURE.md 4.2).
export type Period = { kind: "month"; month: string } | { kind: "week"; weekStart: string };

const MONTH_VALUE_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// A month ("2026-10") or week date ("2026-10-25", moved to its Sunday) of
// the given kind; null when invalid or in the future
function parseValue(kind: string | undefined, value: string | undefined, now: Date): Period | null {
  if (kind === "week" && value && isDateString(value)) {
    const weekStart = startOfWeek(value);
    return weekStart <= today(now) ? { kind: "week", weekStart } : null;
  }
  if (kind === "month" && value && MONTH_VALUE_RE.test(value)) {
    const month = `${value}-01`;
    return month <= currentMonth(now) ? { kind: "month", month } : null;
  }
  return null;
}

// Invalid or future values fall back to the current month
export function parsePeriod(
  params: { period?: string | string[]; value?: string | string[] },
  now: Date = new Date(),
): Period {
  return parseValue(single(params.period), single(params.value), now) ?? { kind: "month", month: currentMonth(now) };
}

export function previousPeriod(period: Period): Period {
  return period.kind === "month"
    ? { kind: "month", month: addMonths(period.month, -1) }
    : { kind: "week", weekStart: addDays(period.weekStart, -7) };
}

// "period=month&value=2026-10"
export function periodToSearch(period: Period): string {
  return period.kind === "month"
    ? `period=month&value=${period.month.slice(0, 7)}`
    : `period=week&value=${period.weekStart}`;
}

// "אוקטובר 2026" / "25.10–31.10"
export function formatPeriodLabel(period: Period): string {
  return period.kind === "month" ? formatMonthLabel(period.month) : formatWeekRange(period.weekStart);
}

// Month of a week's Sunday (used when switching from week to month view)
export function weekMonth(weekStart: string): string {
  return `${weekStart.slice(0, 7)}-01`;
}

// Week to show when switching from month to week view: this week for the
// current month, otherwise the month's last week
export function monthWeek(month: string, now: Date = new Date()): string {
  if (month === currentMonth(now)) return startOfWeek(today(now));
  return startOfWeek(addDays(addMonths(month, 1), -1));
}

// Sundays of all weeks that have days in `month`
export function weeksInMonth(month: string): string[] {
  const end = addDays(addMonths(month, 1), -1);
  const weeks: string[] = [];
  for (let week = startOfWeek(month); week <= end; week = addDays(week, 7)) weeks.push(week);
  return weeks;
}

// `count` weeks that end with `weekStart`, oldest first
export function weeksEnding(weekStart: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(weekStart, (i - count + 1) * 7));
}

// Weeks shown in the chart for the period (DESIGN.md 1.3, 1.7)
export function chartWeeks(period: Period): string[] {
  return period.kind === "month" ? weeksInMonth(period.month) : weeksEnding(period.weekStart, 8);
}

// Period to compare against on the metrics screen (PRD 4.4, DESIGN.md 1.7):
// ?compare=2026-08 for a month or ?compare=2026-08-16 for a week, of the same
// kind as `period`. Invalid, future or missing → the previous period.
export function parseCompare(
  params: { compare?: string | string[] },
  period: Period,
  now: Date = new Date(),
): Period {
  return parseValue(period.kind, single(params.compare), now) ?? previousPeriod(period);
}

// The URL value of a comparison period: "2026-08" / "2026-08-16"
export function periodValue(period: Period): string {
  return period.kind === "month" ? period.month.slice(0, 7) : period.weekStart;
}

export function isSamePeriod(a: Period, b: Period): boolean {
  return periodValue(a) === periodValue(b) && a.kind === b.kind;
}
