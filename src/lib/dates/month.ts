// Months are stored as "YYYY-MM-01" strings (ARCHITECTURE.md 3.1).
// "Now" is always evaluated in Israel time (PRD 5.6).

export const TIME_ZONE = "Asia/Jerusalem";
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])-01$/;

export function isMonth(value: string): boolean {
  return MONTH_RE.test(value);
}

export function currentMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}-01`;
}

export function addMonths(month: string, count: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + count, 1));
  return date.toISOString().slice(0, 10);
}

// Inclusive list of months from `from` to `to`
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

// "אוקטובר 2026"
export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m - 1, 1)));
}
