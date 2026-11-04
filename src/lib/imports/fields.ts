// Budgi's import fields, the sample-file headers and the column mapping

import { PLATFORMS, type Platform } from "@/lib/campaigns/platforms";
import { addDays, isDateString, startOfWeek } from "@/lib/dates/week";

// Columns of the Budgi sample file, in its order (PRD 3.4)
export const IMPORT_FIELDS = [
  { key: "name", header: "שם קמפיין", required: true },
  { key: "platform", header: "פלטפורמה", required: true },
  { key: "week", header: "תחילת שבוע", required: true },
  { key: "spend", header: "הוצאה", required: false },
  { key: "leads", header: "לידים", required: false },
  { key: "deals", header: "עסקאות", required: false },
  { key: "new_customers", header: "לקוחות חדשים", required: false },
  { key: "revenue", header: "הכנסות", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export const VALUE_FIELDS = ["spend", "leads", "deals", "new_customers", "revenue"] as const;
export type ValueField = (typeof VALUE_FIELDS)[number];

export const INTEGER_FIELDS: readonly ValueField[] = ["leads", "deals", "new_customers"];

export const FIELD_LABELS = Object.fromEntries(IMPORT_FIELDS.map((f) => [f.key, f.header])) as Record<
  ImportFieldKey,
  string
>;

// Dates typed once for the whole file: up to 8 days (a "last 7 days" export),
// or one full calendar month, which is split into its weeks (ADR-16)
export type ImportPeriod = { from: string; to: string };

export const MAX_PERIOD_DAYS = 8;

// Where each Budgi field comes from. Column index in the file, or null = not
// imported. The platform can also be one platform for the whole file. The
// week comes from a column (the sample file) or from `period`.
export type ColumnMapping = Record<ValueField | "name" | "week", number | null> & {
  platform: number | Platform | null;
  period: ImportPeriod | null;
};

export function emptyMapping(): ColumnMapping {
  return {
    name: null, platform: null, week: null, period: null,
    spend: null, leads: null, deals: null, new_customers: null, revenue: null,
  };
}

export function isPlatformValue(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}

export const PERIOD_MESSAGES = {
  missing: "יש לבחור מתאריך ועד תאריך",
  order: "תאריך הסיום לפני תאריך ההתחלה",
  tooLong: `אפשר לבחור עד ${MAX_PERIOD_DAYS} ימים, או חודש מלא (מה-1 בחודש ועד היום האחרון שלו).`,
} as const;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

function lastDayOf(month: string): string {
  const [year, m] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

// From the 1st to the last day of the same calendar month
export function isFullMonth(period: ImportPeriod): boolean {
  if (!isDateString(period.from) || !isDateString(period.to)) return false;
  return period.from.endsWith("-01") && period.to === lastDayOf(period.from);
}

// null when the period is usable, otherwise the reason (Hebrew)
export function periodError(period: ImportPeriod): string | null {
  if (!isDateString(period.from) || !isDateString(period.to)) return PERIOD_MESSAGES.missing;
  if (period.to < period.from) return PERIOD_MESSAGES.order;
  if (daysBetween(period.from, period.to) > MAX_PERIOD_DAYS && !isFullMonth(period)) return PERIOD_MESSAGES.tooLong;
  return null;
}

// The Sunday of every week with days in a full month
export function monthWeeks(period: ImportPeriod): string[] {
  const weeks: string[] = [];
  for (let week = startOfWeek(period.from); week <= period.to; week = addDays(week, 7)) weeks.push(week);
  return weeks;
}

export type WeekShare = { weekStart: string } & Record<ValueField, number | null>;

// Splits a full month's totals into its weeks by days (ADR-16). Each week row
// holds a whole week at the month's daily pace, so that the month's total,
// calculated from the weeks by their days in the month (ADR-1), equals the
// file's total. A week shared with the next or previous month gets the pace
// of this month for all its days. Whole numbers (leads, deals, customers) are
// spread with the largest remainder, so they add up to the file's total.
export function splitMonth(period: ImportPeriod, totals: Record<ValueField, number | null>): WeekShare[] {
  const days = daysBetween(period.from, period.to);
  const weeks = monthWeeks(period).map((weekStart) => {
    const first = weekStart < period.from ? period.from : weekStart;
    const lastDay = addDays(weekStart, 6) > period.to ? period.to : addDays(weekStart, 6);
    return { weekStart, inMonth: daysBetween(first, lastDay) };
  });
  const result: WeekShare[] = weeks.map(({ weekStart }) => ({ weekStart }) as WeekShare);

  for (const field of VALUE_FIELDS) {
    const total = totals[field];
    if (total === null) {
      result.forEach((row) => (row[field] = null));
      continue;
    }
    if (!INTEGER_FIELDS.includes(field)) {
      // A full week at the daily pace, in agorot
      result.forEach((row) => (row[field] = Math.round((total / days) * 7 * 100) / 100));
      continue;
    }
    // Whole numbers: each week's share of the month, rounded so the shares add up
    const exact = weeks.map((w) => (total * w.inMonth) / days);
    const shares = exact.map(Math.floor);
    let left = total - shares.reduce((a, b) => a + b, 0);
    const order = exact.map((value, i) => ({ i, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest);
    for (const { i } of order) {
      if (left <= 0) break;
      shares[i]++;
      left--;
    }
    // A shared week holds a whole week at that pace
    result.forEach((row, i) => (row[field] = Math.round((shares[i] * 7) / weeks[i].inMonth)));
  }
  return result;
}

// The Sunday of the week that holds most of the period's days; on a tie,
// the earlier week. A usable period spans at most two weeks.
export function periodWeek(period: ImportPeriod): string {
  const first = startOfWeek(period.from);
  const firstEnd = addDays(first, 6);
  if (period.to <= firstEnd) return first;
  const inFirst = daysBetween(period.from, firstEnd);
  const inSecond = daysBetween(addDays(firstEnd, 1), period.to);
  return inFirst >= inSecond ? first : addDays(first, 7);
}

// True when the period is not a single Sunday–Saturday week
export function periodCrossesWeeks(period: ImportPeriod): boolean {
  return startOfWeek(period.from) !== startOfWeek(period.to);
}

// What is still missing before the mapping can be used (Hebrew), or null
export function missingMapping(mapping: ColumnMapping): string | null {
  const missing: string[] = [];
  if (mapping.platform === null) missing.push("פלטפורמה");
  if (mapping.name === null) missing.push("שם קמפיין");
  if (mapping.week === null && mapping.period === null) missing.push("תאריכים");
  if (missing.length > 0) return `יש לבחור: ${missing.join(", ")}`;
  return mapping.period ? periodError(mapping.period) : null;
}

// Import into one campaign: the dates and at least one value column
export function missingCampaignMapping(mapping: ColumnMapping): string | null {
  const missing: string[] = [];
  if (mapping.period === null) missing.push("תאריכים");
  if (VALUE_FIELDS.every((field) => mapping[field] === null)) missing.push("לפחות עמודת נתונים אחת");
  if (missing.length > 0) return `יש לבחור: ${missing.join(", ")}`;
  return periodError(mapping.period!);
}

// Limits (PRD 3.4)
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DATA_ROWS = 5000;
export const MAX_CAMPAIGN_NAME = 100;
