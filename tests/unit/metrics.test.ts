import { describe, expect, it } from "vitest";
import type { Period } from "@/lib/dates/period";
import {
  allocatedBudget,
  budgetGap,
  goalProgress,
  hasPeriodData,
  periodSummary,
  weeklySeries,
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

describe("Metrics Service for a month or a week (Milestone 5)", () => {
  const OCT: Period = { kind: "month", month: "2030-10-01" };
  const SEP: Period = { kind: "month", month: "2030-09-01" };
  // Known data: a week that crosses September/October, and two October weeks
  const rows = [
    week("2030-09-29", { spend: 700, leads: 14, deals: 7, new_customers: 7, revenue: 2100 }),
    week("2030-10-06", { spend: 1000, leads: 20, deals: 4, new_customers: 2, revenue: 3000 }),
    week("2030-10-13", { spend: 500, revenue: 0 }),
  ];

  it("sums a month after splitting the crossing week (5/7 of it in October)", () => {
    const s = periodSummary(rows, OCT);
    expect(s.spend).toBeCloseTo(500 + 1000 + 500);
    expect(s.leads).toBeCloseTo(10 + 20);
    expect(s.deals).toBeCloseTo(5 + 4);
    expect(s.revenue).toBeCloseTo(1500 + 3000);
    expect(periodSummary(rows, SEP).spend).toBeCloseTo(200);
  });

  it("uses a week's values as they are", () => {
    const s = periodSummary(rows, { kind: "week", weekStart: "2030-09-29" });
    expect(s.spend).toBe(700);
    expect(s.cpl.value).toBe(50);
    expect(periodSummary(rows, { kind: "week", weekStart: "2030-10-20" }).spend).toBeNull();
  });

  it("calculates CPL, Cost per Deal, CAC (new customers), ROAS and Conversion Rate", () => {
    const s = periodSummary(rows, OCT);
    // Only weeks with both values: the crossing week (5/7) and 6.10
    expect(s.cpl.value).toBeCloseTo(1500 / 30); // 500 + 1000 over 10 + 20 leads
    expect(s.costPerDeal.value).toBeCloseTo(1500 / 9);
    expect(s.cac.value).toBeCloseTo(1500 / 7); // 5 + 2 new customers, not deals
    expect(s.roas.value).toBeCloseTo(4500 / 2000);
    expect(s.conversionRate.value).toBeCloseTo((9 / 30) * 100);
    expect(s.cpl.reason).toBeNull();
  });

  it("explains why a metric is not available", () => {
    const only = (values: Partial<Omit<WeekRow, "week_start">>) => [week("2030-10-06", values)];
    expect(periodSummary(only({ spend: 100 }), OCT).cpl).toEqual({ value: null, reason: "לא הוזנו לידים בתקופה" });
    expect(periodSummary(only({ leads: 5 }), OCT).cpl).toEqual({ value: null, reason: "לא הוזנה הוצאה בתקופה" });
    expect(periodSummary(only({ spend: 100, leads: 0 }), OCT).cpl).toEqual({
      value: null,
      reason: "מספר הלידים בתקופה הוא 0",
    });
    const apart = [week("2030-10-06", { spend: 100 }), week("2030-10-13", { leads: 4 })];
    expect(periodSummary(apart, OCT).cpl.reason).toBe("לא הוזנו הוצאה ולידים באותם שבועות");
    expect(periodSummary([], OCT).roas).toEqual({ value: null, reason: "לא הוזנה הוצאה בתקופה" });
  });

  it("knows whether a period has data", () => {
    expect(hasPeriodData(rows, OCT)).toBe(true);
    expect(hasPeriodData(rows, { kind: "month", month: "2030-11-01" })).toBe(false);
  });
});

describe("budget gaps and goals (PRD 4.2)", () => {
  it("total budget minus the campaigns' budgets; campaigns without a budget are not counted", () => {
    expect(budgetGap(20000, [5000, 4000, null])).toBe(11000);
    expect(budgetGap(5000, [4000, 3000])).toBe(-2000);
    expect(budgetGap(null, [4000])).toBeNull();
    expect(allocatedBudget([null, null])).toBe(0);
  });

  it("planned minus actual", () => {
    expect(remainingBudget(5000, 5240)).toBe(-240);
    expect(remainingBudget(5000, null)).toBeNull();
  });

  it("progress to a goal, in percent", () => {
    expect(goalProgress(30000, 40000)).toBe(75);
    expect(goalProgress(50000, 40000)).toBe(125);
    expect(goalProgress(3.2, 4)).toBeCloseTo(80); // ROAS against the minimum
    expect(goalProgress(1000, null)).toBeNull();
    expect(goalProgress(1000, 0)).toBeNull();
    expect(goalProgress(null, 1000)).toBeNull();
  });
});

describe("weekly chart series (DESIGN.md 2.4)", () => {
  it("gives whole-week totals across campaigns, and null for weeks without data", () => {
    const rows = [
      week("2030-09-29", { spend: 700, revenue: 2100 }),
      week("2030-09-29", { spend: 300 }),
      week("2030-10-13", { revenue: 500 }),
    ];
    expect(weeklySeries(rows, ["2030-09-29", "2030-10-06", "2030-10-13"])).toEqual([
      { weekStart: "2030-09-29", spend: 1000, revenue: 2100 },
      { weekStart: "2030-10-06", spend: null, revenue: null },
      { weekStart: "2030-10-13", spend: null, revenue: 500 },
    ]);
  });
});

describe("rangeTotal (ADR-20)", () => {
  it("adds up the days of each week inside the range", async () => {
    const { rangeTotal } = await import("@/server/services/metrics");
    const rows = [
      { week_start: "2026-10-04", spend: 700, leads: null, deals: null, new_customers: null, revenue: null },
      { week_start: "2026-10-11", spend: 1400, leads: null, deals: null, new_customers: null, revenue: null },
    ];
    // 1–7.10: 4–7.10 of the first week (4 days × 100)
    expect(rangeTotal(rows, "2026-10-01", "2026-10-07", "spend")).toBeCloseTo(400);
    // 1–14.10: the whole first week and 11–14.10 of the second (4 × 200)
    expect(rangeTotal(rows, "2026-10-01", "2026-10-14", "spend")).toBeCloseTo(1500);
    expect(rangeTotal(rows, "2026-10-01", "2026-10-07", "revenue")).toBeNull();
  });
});
