import { describe, expect, it } from "vitest";
import type { WeekRow } from "@/server/services/metrics";
import {
  NOT_ENOUGH_DATA,
  coveredDays,
  fieldForecast,
  forecastSeries,
  historyMonths,
  isCompleteMonth,
  monthForecast,
} from "@/server/services/forecast";

function week(week_start: string, values: Partial<Omit<WeekRow, "week_start">>): WeekRow {
  return { week_start, spend: null, leads: null, deals: null, new_customers: null, revenue: null, ...values };
}

// Calendar 2030: 1 December is a Sunday, so December's weeks are 1.12, 8.12,
// 15.12, 22.12 and 29.12 (31 days). October's weeks: 29.9–26.10 and 27.10
// (shared with November); November's: 27.10, 3.11, 10.11, 17.11, 24.11.
const DEC = "2030-12-01";
const OCT_WEEKS = ["2030-09-29", "2030-10-06", "2030-10-13", "2030-10-20", "2030-10-27"];
const NOV_WEEKS = ["2030-11-03", "2030-11-10", "2030-11-17", "2030-11-24"];

const weeks = (starts: string[], values: Partial<Omit<WeekRow, "week_start">>) => starts.map((s) => week(s, values));

describe("covered days (PRD 4.5)", () => {
  it("counts from the start of the month to the end of the last week with data", () => {
    expect(coveredDays([week("2030-12-01", { spend: 1 })], DEC)).toBe(7);
    expect(coveredDays([week("2030-12-01", { spend: 1 }), week("2030-12-08", { spend: 1 })], DEC)).toBe(14);
  });

  it("stops at the end of the month for a week that crosses into the next one", () => {
    expect(coveredDays([week("2030-12-29", { spend: 1 })], DEC)).toBe(31);
  });

  it("counts a week that started in the previous month only up to its Saturday", () => {
    // 29.12.2030–4.1.2031 → 4 days of January
    expect(coveredDays([week("2030-12-29", { spend: 1 })], "2031-01-01")).toBe(4);
  });

  it("is 0 without weeks in the month", () => {
    expect(coveredDays([], DEC)).toBe(0);
    expect(coveredDays([week("2030-11-24", { spend: 1 })], DEC)).toBe(0);
  });
});

describe("the 7-day minimum", () => {
  it("gives no number with fewer than 7 covered days", () => {
    const result = fieldForecast([week("2030-12-29", { spend: 400 })], "2031-01-01", "spend");
    expect(result.forecast).toBeNull();
    expect(result.reason).toBe(NOT_ENOUGH_DATA);
    expect(monthForecast([week("2030-12-29", { spend: 400 })], "2031-01-01", { ended: false }).enough).toBe(false);
  });

  it("gives a forecast with exactly 7 covered days", () => {
    const result = fieldForecast([week("2030-12-01", { spend: 700 })], DEC, "spend");
    expect(result.forecast).toBeCloseTo(3100);
  });
});

describe("pace forecast", () => {
  it("is so far ÷ covered days × days in month", () => {
    const rows = weeks(["2030-12-01", "2030-12-08"], { spend: 700, revenue: 2100, leads: 7, deals: 2 });
    const result = monthForecast(rows, DEC, { ended: false });
    expect(result.coveredDays).toBe(14);
    expect(result.spend).toEqual({ actual: 1400, forecast: 3100, basis: "pace", reason: null });
    expect(result.revenue.forecast).toBeCloseTo(9300);
    expect(result.leads.forecast).toBeCloseTo(31);
    expect(result.deals.forecast).toBeCloseTo((4 / 14) * 31);
    expect(result.roas.forecast).toBeCloseTo(3);
    expect(result.roas.basis).toBe("pace");
  });

  it("counts the split part of a week that started in the previous month", () => {
    // 24.11–30.11 has no days in December; 29.12 has 3
    const rows = [week("2030-12-01", { spend: 700 }), week("2030-12-29", { spend: 700 })];
    const result = fieldForecast(rows, DEC, "spend");
    expect(result.actual).toBeCloseTo(1000);
    expect(result.forecast).toBeCloseTo(1000); // covered 31 → the month itself
  });

  it("keeps a field that was not entered as not available, not 0", () => {
    const result = monthForecast([week("2030-12-01", { spend: 700 })], DEC, { ended: false });
    expect(result.revenue).toEqual({ actual: null, forecast: null, basis: null, reason: "לא הוזנו הכנסות בחודש" });
    expect(result.roas.forecast).toBeNull();
  });

  it("has no expected ROAS when the expected spend is 0", () => {
    const result = monthForecast([week("2030-12-01", { spend: 0, revenue: 100 })], DEC, { ended: false });
    expect(result.roas.forecast).toBeNull();
    expect(result.roas.reason).toBe("ההוצאה הצפויה היא 0");
  });
});

describe("history (70/30)", () => {
  // October: 500 (5/7 of 29.9) + 3 × 700 + 500 (5/7 of 27.10) = 3,100
  // November: 200 (2/7 of 27.10) + 4 × 700 = 3,000 → average 3,050
  const history = [...weeks(OCT_WEEKS, { spend: 700 }), ...weeks(NOV_WEEKS, { spend: 700 })];
  const december = weeks(["2030-12-01", "2030-12-08"], { spend: 700 });

  it("a month is complete only when every one of its weeks has data", () => {
    expect(isCompleteMonth(history, "2030-10-01")).toBe(true);
    expect(isCompleteMonth(history, "2030-11-01")).toBe(true);
    const missingWeek = history.filter((row) => row.week_start !== "2030-11-10");
    expect(isCompleteMonth(missingWeek, "2030-11-01")).toBe(false);
    expect(historyMonths(missingWeek, DEC)).toEqual(["2030-10-01"]);
  });

  it("with two complete previous months: 70% pace + 30% their average", () => {
    const result = fieldForecast([...history, ...december], DEC, "spend");
    expect(result.basis).toBe("pace_and_history");
    expect(result.forecast).toBeCloseTo(0.7 * 3100 + 0.3 * 3050);
  });

  it("with only one complete previous month: pace only", () => {
    const rows = [...history.filter((row) => row.week_start !== "2030-11-10"), ...december];
    expect(fieldForecast(rows, DEC, "spend")).toMatchObject({ basis: "pace", forecast: 3100 });
  });

  it("averages up to the three previous months", () => {
    const september = weeks(["2030-09-01", "2030-09-08", "2030-09-15", "2030-09-22"], { spend: 700 });
    // September: 4 × 700 + 2/7 of 29.9 (200) = 3,000
    const rows = [...september, ...history, ...december];
    expect(historyMonths(rows, DEC)).toEqual(["2030-11-01", "2030-10-01", "2030-09-01"]);
    expect(fieldForecast(rows, DEC, "spend").forecast).toBeCloseTo(0.7 * 3100 + 0.3 * ((3000 + 3100 + 3000) / 3));
  });

  it("leaves out previous months where the field was not entered", () => {
    const rows = [...history, ...weeks(["2030-12-01", "2030-12-08"], { spend: 700, revenue: 1000 })];
    expect(fieldForecast(rows, DEC, "revenue").basis).toBe("pace");
  });

  it("never forecasts below what already happened", () => {
    const low = [...weeks(OCT_WEEKS, { spend: 70 }), ...weeks(NOV_WEEKS, { spend: 70 })];
    const fullDecember = weeks(["2030-12-01", "2030-12-08", "2030-12-15", "2030-12-22", "2030-12-29"], { spend: 700 });
    const result = fieldForecast([...low, ...fullDecember], DEC, "spend");
    expect(result.actual).toBeCloseTo(3100);
    expect(result.forecast).toBeCloseTo(3100);
  });
});

describe("an ended month", () => {
  it("shows actual values only", () => {
    const rows = weeks(["2030-12-01", "2030-12-08"], { spend: 700, revenue: 2100 });
    const result = monthForecast(rows, DEC, { ended: true });
    expect(result.spend).toEqual({ actual: 1400, forecast: null, basis: null, reason: null });
    expect(result.revenue.actual).toBe(4200);
    expect(result.roas.actual).toBeCloseTo(3);
    expect(result.roas.forecast).toBeNull();
    expect(forecastSeries(rows, DEC, result).every((p) => p.spendForecast === null && p.revenueForecast === null)).toBe(true);
  });
});

describe("chart points", () => {
  it("continue from the last actual week at the expected daily rate × 7", () => {
    // Forecast 3,100; (3,100 − 1,400) ÷ 17 remaining days = 100 a day → 700 a week
    const rows = weeks(["2030-12-01", "2030-12-08"], { spend: 700 });
    const points = forecastSeries(rows, DEC, monthForecast(rows, DEC, { ended: false }));
    expect(points.map((p) => p.spend)).toEqual([700, 700, null, null, null]);
    expect(points[0].spendForecast).toBeNull();
    expect(points[1].spendForecast).toBe(700);
    for (const p of points.slice(2)) expect(p.spendForecast).toBeCloseTo(700);
    expect(points.every((p) => p.revenueForecast === null)).toBe(true);
  });

  it("keeps a week without data as a gap", () => {
    const rows = [week("2030-12-01", { spend: 700 }), week("2030-12-15", { spend: 700 })];
    const points = forecastSeries(rows, DEC, monthForecast(rows, DEC, { ended: false }));
    expect(points[1].spend).toBeNull();
    expect(points[1].spendForecast).toBeNull();
    expect(points[2].spendForecast).toBe(700);
  });
});
