import { describe, expect, it } from "vitest";
import { DEFAULT_ALERT_SETTINGS } from "@/lib/alerts/types";
import {
  alertSettingsSchema,
  fromThresholdConfig,
  toAlertSettingsInput,
  toThresholdConfig,
} from "@/lib/validation/alert-settings";

const valid = toAlertSettingsInput(DEFAULT_ALERT_SETTINGS);

function withField(type: keyof typeof valid, field: "percent" | "weeks", value: string) {
  return { ...valid, [type]: { ...valid[type], [field]: value } };
}

function firstError(input: unknown) {
  const result = alertSettingsSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
}

describe("alert settings validation", () => {
  it("accepts the defaults", () => {
    const result = alertSettingsSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.performance_drop).toEqual({ enabled: true, percent: 25, weeks: 4 });
  });

  it("rejects negative, decimal, empty and too large thresholds in Hebrew", () => {
    expect(firstError(withField("spend_pace", "percent", "-5"))).toBe("יש להזין מספר שאינו שלילי");
    expect(firstError(withField("spend_pace", "percent", "2.5"))).toBe("יש להזין מספר שלם");
    expect(firstError(withField("spend_pace", "percent", ""))).toBe("יש להזין מספר");
    expect(firstError(withField("spend_pace", "percent", "501"))).toBe("יש להזין סף בין 0 ל-500");
    expect(firstError(withField("budget_overrun", "percent", "0"))).toBeNull();
  });

  it("allows 2–12 weeks to compare", () => {
    expect(firstError(withField("performance_drop", "weeks", "1"))).toBe("יש להזין בין 2 ל-12 שבועות");
    expect(firstError(withField("performance_drop", "weeks", "13"))).toBe("יש להזין בין 2 ל-12 שבועות");
    expect(firstError(withField("performance_drop", "weeks", "12"))).toBeNull();
  });

  it("stores only the fields each type uses, and reads them back", () => {
    const setting = { enabled: false, percent: 15, weeks: 6 };
    expect(toThresholdConfig("spend_pace", setting)).toEqual({ percent: 15 });
    expect(toThresholdConfig("performance_drop", setting)).toEqual({ percent: 15, weeks: 6 });
    expect(toThresholdConfig("goal_reached", setting)).toEqual({});
    expect(fromThresholdConfig("performance_drop", false, { percent: 15, weeks: 6 })).toEqual(setting);
  });

  it("falls back to the defaults for an invalid stored config", () => {
    expect(fromThresholdConfig("spend_pace", true, { percent: -1 })).toEqual(DEFAULT_ALERT_SETTINGS.spend_pace);
    expect(fromThresholdConfig("spend_pace", true, "x")).toEqual(DEFAULT_ALERT_SETTINGS.spend_pace);
  });
});
