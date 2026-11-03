import { describe, expect, it } from "vitest";
import { addDays, formatWeekRange, isDateString, isWeekStart, startOfWeek } from "@/lib/dates/week";

describe("weeks (Sunday–Saturday)", () => {
  it("normalizes any day to the Sunday of its week", () => {
    expect(startOfWeek("2026-10-25")).toBe("2026-10-25"); // Sunday stays
    expect(startOfWeek("2026-10-28")).toBe("2026-10-25"); // Wednesday
    expect(startOfWeek("2026-10-31")).toBe("2026-10-25"); // Saturday
    expect(startOfWeek("2026-11-01")).toBe("2026-11-01"); // next Sunday
  });

  it("crosses month and year boundaries", () => {
    expect(startOfWeek("2026-10-02")).toBe("2026-09-27");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-27");
  });

  it("knows a week start and a real date", () => {
    expect(isWeekStart("2026-10-25")).toBe(true);
    expect(isWeekStart("2026-10-26")).toBe(false);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("25/10/2026")).toBe(false);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("shows the week as a date range", () => {
    expect(formatWeekRange("2026-10-25")).toBe("25.10–31.10");
    expect(formatWeekRange("2026-09-27")).toBe("27.09–03.10");
  });
});
