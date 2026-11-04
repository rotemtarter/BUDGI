import { describe, expect, it } from "vitest";
import { isFullMonth, monthWeeks, splitMonth } from "@/lib/imports/fields";
import { validateRows } from "@/lib/imports/rows";
import { emptyMapping } from "@/lib/imports/fields";
import { monthTotal, type WeekRow } from "@/server/services/metrics";

// Importing a full month (ADR-16): split into the month's weeks by days, so
// that the month total calculated from the weeks equals the file's total.
const NOV = { from: "2026-11-01", to: "2026-11-30" };
const OCT = { from: "2026-10-01", to: "2026-10-31" };

const toRows = (weeks: ReturnType<typeof splitMonth>): WeekRow[] =>
  weeks.map(({ weekStart, ...values }) => ({ week_start: weekStart, ...values }));

describe("full month", () => {
  it("knows a full calendar month", () => {
    expect(isFullMonth(NOV)).toBe(true);
    expect(isFullMonth({ from: "2028-02-01", to: "2028-02-29" })).toBe(true);
    expect(isFullMonth({ from: "2026-11-01", to: "2026-11-29" })).toBe(false);
    expect(isFullMonth({ from: "2026-11-02", to: "2026-11-30" })).toBe(false);
  });

  it("lists every week with days in the month", () => {
    // November 2026 starts on a Sunday; the last week runs into December
    expect(monthWeeks(NOV)).toEqual(["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
    // October 2026 starts on a Thursday: the first week starts in September
    expect(monthWeeks(OCT)[0]).toBe("2026-09-27");
    expect(monthWeeks(OCT)).toHaveLength(5);
  });

  it("keeps the month's totals, money and whole numbers", () => {
    const totals = { spend: 3000, leads: 10, deals: 3, new_customers: null, revenue: 9000.5 };
    for (const period of [NOV, OCT]) {
      const weeks = splitMonth(period, totals);
      const rows = toRows(weeks);
      const month = `${period.from.slice(0, 7)}-01`;
      expect(monthTotal(rows, month, "spend")).toBeCloseTo(3000, 1);
      expect(monthTotal(rows, month, "revenue")).toBeCloseTo(9000.5, 1);
      expect(Math.round(monthTotal(rows, month, "leads")!)).toBe(10);
      expect(Math.round(monthTotal(rows, month, "deals")!)).toBe(3);
      expect(monthTotal(rows, month, "new_customers")).toBeNull();
      for (const week of weeks) {
        expect(Number.isInteger(week.leads)).toBe(true);
        expect(week.new_customers).toBeNull();
      }
    }
  });

  it("gives a full week of the month a seventh-of-the-pace share", () => {
    const weeks = splitMonth(NOV, { spend: 3000, leads: null, deals: null, new_customers: null, revenue: null });
    expect(weeks[0].spend).toBe(700); // 3,000 ÷ 30 days × 7
    expect(weeks[4].spend).toBe(700); // Nov 29–30, at the same pace for the whole week
  });

  it("splits every file row into the month's weeks", () => {
    const table = {
      headers: ["name", "spend", "leads"],
      rows: [
        { line: 2, cells: ["Search", 3000, 30] },
        { line: 3, cells: ["Brand", 600, null] },
      ],
    };
    const mapping = { ...emptyMapping(), name: 0, platform: "google_ads" as const, spend: 1, leads: 2, period: NOV };
    const { valid, errors } = validateRows(table, mapping);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(10);
    expect(valid.filter((r) => r.line === 2).map((r) => r.weekStart)).toEqual(monthWeeks(NOV));
    expect(valid.filter((r) => r.line === 3).every((r) => r.leads === null)).toBe(true);
  });

  it("reports a campaign twice in a month file once per line", () => {
    const table = {
      headers: ["name", "spend"],
      rows: [
        { line: 2, cells: ["Search", 100] },
        { line: 3, cells: ["search ", 200] },
      ],
    };
    const mapping = { ...emptyMapping(), name: 0, platform: "google_ads" as const, spend: 1, period: NOV };
    const { valid, errors } = validateRows(table, mapping);
    expect(valid).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([2, 3]);
    expect(errors[0].reasons[0]).toContain("שורה 3");
  });
});
