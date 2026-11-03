import { describe, expect, it } from "vitest";
import {
  chartWeeks,
  formatPeriodLabel,
  monthWeek,
  parseCompare,
  parsePeriod,
  periodToSearch,
  previousPeriod,
  weekMonth,
  weeksEnding,
  weeksInMonth,
} from "@/lib/dates/period";

// 3 November 2026, noon in Israel (a Tuesday)
const NOW = new Date("2026-11-03T10:00:00Z");

describe("parsePeriod (PRD 4.2, ARCHITECTURE.md 4.2)", () => {
  it("defaults to the current month", () => {
    expect(parsePeriod({}, NOW)).toEqual({ kind: "month", month: "2026-11-01" });
  });

  it("reads a month and a week", () => {
    expect(parsePeriod({ period: "month", value: "2026-10" }, NOW)).toEqual({ kind: "month", month: "2026-10-01" });
    expect(parsePeriod({ period: "week", value: "2026-10-25" }, NOW)).toEqual({ kind: "week", weekStart: "2026-10-25" });
  });

  it("moves a week date that is not a Sunday to its Sunday", () => {
    expect(parsePeriod({ period: "week", value: "2026-10-29" }, NOW)).toEqual({ kind: "week", weekStart: "2026-10-25" });
  });

  it("falls back to the current month for invalid or future values", () => {
    const fallback = { kind: "month", month: "2026-11-01" };
    expect(parsePeriod({ period: "month", value: "2026-13" }, NOW)).toEqual(fallback);
    expect(parsePeriod({ period: "month", value: "2026-12" }, NOW)).toEqual(fallback);
    expect(parsePeriod({ period: "week", value: "2026-02-30" }, NOW)).toEqual(fallback);
    expect(parsePeriod({ period: "week", value: "2026-11-08" }, NOW)).toEqual(fallback);
    expect(parsePeriod({ period: "year", value: "2026" }, NOW)).toEqual(fallback);
    expect(parsePeriod({ period: ["month", "week"], value: "2026-10" }, NOW)).toEqual(fallback);
  });

  it("allows the current week", () => {
    expect(parsePeriod({ period: "week", value: "2026-11-03" }, NOW)).toEqual({ kind: "week", weekStart: "2026-11-01" });
  });
});

describe("periods", () => {
  it("finds the previous month and week", () => {
    expect(previousPeriod({ kind: "month", month: "2026-01-01" })).toEqual({ kind: "month", month: "2025-12-01" });
    expect(previousPeriod({ kind: "week", weekStart: "2026-11-01" })).toEqual({ kind: "week", weekStart: "2026-10-25" });
  });

  it("writes the URL and labels", () => {
    expect(periodToSearch({ kind: "month", month: "2026-10-01" })).toBe("period=month&value=2026-10");
    expect(periodToSearch({ kind: "week", weekStart: "2026-10-25" })).toBe("period=week&value=2026-10-25");
    expect(formatPeriodLabel({ kind: "week", weekStart: "2026-10-25" })).toBe("25.10–31.10");
  });

  it("switches between week and month", () => {
    expect(weekMonth("2026-09-27")).toBe("2026-09-01");
    expect(monthWeek("2026-11-01", NOW)).toBe("2026-11-01");
    expect(monthWeek("2026-10-01", NOW)).toBe("2026-10-25");
  });
});

describe("chart weeks (DESIGN.md 1.3, 1.7)", () => {
  it("lists every week with days in the month, including weeks that cross months", () => {
    // October 2030: 1.10 is a Tuesday, 31.10 a Thursday
    expect(weeksInMonth("2030-10-01")).toEqual(["2030-09-29", "2030-10-06", "2030-10-13", "2030-10-20", "2030-10-27"]);
    // August 2026 starts on a Saturday and has 6 weeks
    expect(weeksInMonth("2026-08-01")).toHaveLength(6);
    // February 2026 starts on a Sunday and has exactly 4 weeks
    expect(weeksInMonth("2026-02-01")).toEqual(["2026-02-01", "2026-02-08", "2026-02-15", "2026-02-22"]);
  });

  it("shows the eight weeks that end with the chosen week", () => {
    const weeks = weeksEnding("2026-10-25", 8);
    expect(weeks).toHaveLength(8);
    expect(weeks[0]).toBe("2026-09-06");
    expect(weeks[7]).toBe("2026-10-25");
    expect(chartWeeks({ kind: "week", weekStart: "2026-10-25" })).toEqual(weeks);
  });
});

describe("comparison period (PRD 4.4, DESIGN.md 1.7)", () => {
  const OCT = { kind: "month", month: "2026-10-01" } as const;
  const WEEK = { kind: "week", weekStart: "2026-10-25" } as const;

  it("defaults to the previous period", () => {
    expect(parseCompare({}, OCT, NOW)).toEqual({ kind: "month", month: "2026-09-01" });
    expect(parseCompare({}, WEEK, NOW)).toEqual({ kind: "week", weekStart: "2026-10-18" });
  });

  it("reads a picked month or week of the same kind", () => {
    expect(parseCompare({ compare: "2025-10" }, OCT, NOW)).toEqual({ kind: "month", month: "2025-10-01" });
    expect(parseCompare({ compare: "2026-08-19" }, WEEK, NOW)).toEqual({ kind: "week", weekStart: "2026-08-16" });
  });

  it("ignores a value of the other kind, an invalid one or a future one", () => {
    const previous = { kind: "month", month: "2026-09-01" };
    expect(parseCompare({ compare: "2026-08-16" }, OCT, NOW)).toEqual(previous);
    expect(parseCompare({ compare: "2026-13" }, OCT, NOW)).toEqual(previous);
    expect(parseCompare({ compare: "2027-01" }, OCT, NOW)).toEqual(previous);
    expect(parseCompare({ compare: "2026-10" }, WEEK, NOW)).toEqual({ kind: "week", weekStart: "2026-10-18" });
  });
});
