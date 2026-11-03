import { describe, expect, it } from "vitest";
import { addMonths, currentMonth, formatMonthLabel, monthsBetween } from "@/lib/dates/month";
import { formatILS, formatNumberInput } from "@/lib/currency/format";

describe("currentMonth (Asia/Jerusalem)", () => {
  it("uses Israel time, not UTC, at the month boundary", () => {
    // 31 Oct 2026 22:30 UTC is already 1 Nov 00:30 in Israel (UTC+2 in winter)
    expect(currentMonth(new Date("2026-10-31T22:30:00Z"))).toBe("2026-11-01");
    expect(currentMonth(new Date("2026-10-31T21:30:00Z"))).toBe("2026-10-01");
  });
});

describe("month helpers", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("lists months inclusively", () => {
    expect(monthsBetween("2026-11-01", "2027-01-01")).toEqual([
      "2026-11-01",
      "2026-12-01",
      "2027-01-01",
    ]);
  });

  it("formats a Hebrew month label", () => {
    expect(formatMonthLabel("2026-10-01")).toBe("אוקטובר 2026");
  });
});

describe("currency", () => {
  it("formats shekels with a thousands separator", () => {
    expect(formatILS(12500)).toBe("₪12,500");
    expect(formatILS(12500.5)).toBe("₪12,500.50");
  });

  it("formats input values and keeps empty as empty", () => {
    expect(formatNumberInput(40000)).toBe("40,000");
    expect(formatNumberInput(null)).toBe("");
  });
});
