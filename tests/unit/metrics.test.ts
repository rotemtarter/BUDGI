import { describe, expect, it } from "vitest";
import {
  monthRatio,
  monthShare,
  monthSummary,
  monthTotal,
  percentChange,
  remainingBudget,
  type WeekRow,
} from "@/server/services/metrics";

function week(week_start: string, values: Partial<Omit<WeekRow, "week_start">>): WeekRow {
  return { week_start, spend: null, leads: null, deals: null, new_customers: null, revenue: null, ...values };
}

describe("splitting a week between months (PRD 4.3)", () => {
  it("gives 2/7 to September and 5/7 to October for 29.9–5.10", () => {
    // In 2030, 29 September is a Sunday
    expect(monthShare("2030-09-29", "2030-09-01")).toBeCloseTo(2 / 7);
    expect(monthShare("2030-09-29", "2030-10-01")).toBeCloseTo(5 / 7);
    expect(monthShare("2030-09-29", "2030-11-01")).toBe(0);
  });

  it("sums the split values, and keeps not-entered fields as null", () => {
    const rows = [week("2030-09-29", { spend: 700, leads: 7 }), week("2030-10-06", { spend: 100 })];
    expect(monthTotal(rows, "2030-10-01", "spend")).toBeCloseTo(600);
    expect(monthTotal(rows, "2030-09-01", "spend")).toBeCloseTo(200);
    expect(monthTotal(rows, "2030-10-01", "leads")).toBeCloseTo(5);
    expect(monthTotal(rows, "2030-10-01", "revenue")).toBeNull();
  });
});

describe("ratios (PRD 4.4)", () => {
  it("uses only weeks where both numerator and denominator were entered", () => {
    const rows = [
      week("2030-10-06", { spend: 1000, leads: 10 }),
      week("2030-10-13", { spend: 5000 }), // no leads → not part of CPL
    ];
    expect(monthRatio(rows, "2030-10-01", "spend", "leads")).toBe(100);
  });

  it("is not available when the denominator is 0 or missing", () => {
    expect(monthRatio([week("2030-10-06", { spend: 1000, leads: 0 })], "2030-10-01", "spend", "leads")).toBeNull();
    expect(monthRatio([week("2030-10-06", { spend: 1000 })], "2030-10-01", "spend", "leads")).toBeNull();
    expect(monthRatio([], "2030-10-01", "spend", "leads")).toBeNull();
  });

  it("summarizes CPL, Cost per Deal, CAC and ROAS for the month", () => {
    const rows = [week("2030-10-06", { spend: 2000, leads: 40, deals: 8, new_customers: 5, revenue: 6000 })];
    expect(monthSummary(rows, "2030-10-01")).toEqual({
      spend: 2000,
      leads: 40,
      deals: 8,
      newCustomers: 5,
      revenue: 6000,
      cpl: 50,
      costPerDeal: 250,
      cac: 400,
      roas: 3,
    });
  });
});

describe("change and remaining budget", () => {
  it("calculates the change in percent against the previous month", () => {
    expect(percentChange(3.3, 3)).toBeCloseTo(10);
    expect(percentChange(2, 4)).toBe(-50);
    expect(percentChange(2, 0)).toBeNull();
    expect(percentChange(null, 4)).toBeNull();
  });

  it("calculates the remaining budget only when both values exist", () => {
    expect(remainingBudget(5000, 1200)).toBe(3800);
    expect(remainingBudget(5000, null)).toBeNull();
    expect(remainingBudget(null, 1200)).toBeNull();
  });
});
