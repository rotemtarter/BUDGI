import { TIME_ZONE } from "./month";

// Dates are "YYYY-MM-DD" strings without a time. Weeks run Sunday–Saturday and
// are identified by their Sunday (PRD 4.3, ARCHITECTURE.md 3.1).

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUTC(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// A real calendar date (rejects e.g. 2026-02-30)
export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  return fromUTC(toUTC(value)) === value;
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

// Sunday of the week that contains `date`
export function startOfWeek(date: string): string {
  return addDays(date, -toUTC(date).getUTCDay());
}

export function isWeekStart(date: string): boolean {
  return isDateString(date) && toUTC(date).getUTCDay() === 0;
}

// Today's date in Israel time
export function today(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dayMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

// "25.10–31.10"
export function formatWeekRange(weekStart: string): string {
  return `${dayMonth(weekStart)}–${dayMonth(addDays(weekStart, 6))}`;
}

// "25/10/2026"
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
