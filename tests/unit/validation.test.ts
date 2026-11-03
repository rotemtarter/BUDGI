import { describe, expect, it } from "vitest";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { goalsSchema } from "@/lib/validation/goals";

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("onboarding validation", () => {
  it("accepts amounts with thousands separators and ₪", () => {
    const result = onboardingSchema.safeParse({ budget: "12,500", revenueGoal: "₪40,000.50" });
    expect(result.success && result.data).toEqual({ budget: 12500, revenueGoal: 40000.5 });
  });

  it("requires both fields, with Hebrew messages", () => {
    const result = onboardingSchema.safeParse({ budget: "", revenueGoal: " " });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      "יש להזין תקציב שיווק חודשי",
      "יש להזין יעד הכנסות חודשי",
    ]);
  });

  it("rejects negative numbers, text and more than two decimals", () => {
    expect(firstError(onboardingSchema.safeParse({ budget: "-5", revenueGoal: "1" }))).toBe(
      "יש להזין מספר שאינו שלילי",
    );
    expect(firstError(onboardingSchema.safeParse({ budget: "abc", revenueGoal: "1" }))).toBe(
      "יש להזין מספר",
    );
    expect(firstError(onboardingSchema.safeParse({ budget: "1.234", revenueGoal: "1" }))).toBe(
      "אפשר להזין עד שתי ספרות אחרי הנקודה",
    );
  });

  it("accepts zero", () => {
    expect(onboardingSchema.safeParse({ budget: "0", revenueGoal: "0" }).success).toBe(true);
  });
});

describe("goals validation", () => {
  const base = { month: "2026-10-01", revenue: "", deals: "", leads: "", min_roas: "" };

  it("treats empty fields as no goal (null), not zero", () => {
    const result = goalsSchema.safeParse(base);
    expect(result.success && result.data).toEqual({
      month: "2026-10-01",
      revenue: null,
      deals: null,
      leads: null,
      min_roas: null,
    });
  });

  it("requires whole numbers for deals and leads", () => {
    expect(firstError(goalsSchema.safeParse({ ...base, deals: "2.5" }))).toBe("יש להזין מספר שלם");
    expect(firstError(goalsSchema.safeParse({ ...base, leads: "-1" }))).toBe(
      "יש להזין מספר שאינו שלילי",
    );
  });

  it("allows a decimal minimum ROAS", () => {
    const result = goalsSchema.safeParse({ ...base, min_roas: "2.5" });
    expect(result.success && result.data.min_roas).toBe(2.5);
  });

  it("rejects an invalid month", () => {
    expect(goalsSchema.safeParse({ ...base, month: "2026-10-15" }).success).toBe(false);
  });
});
