import { describe, expect, it } from "vitest";
import { createCampaignSchema, updateCampaignSchema } from "@/lib/validation/campaigns";
import { AT_LEAST_ONE_FIELD_MESSAGE, weekSchema } from "@/lib/validation/weeks";

const emptyWeek = { date: "2026-10-28", spend: "", leads: "", deals: "", new_customers: "", revenue: "" };

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((i) => i.message) ?? [];
}

describe("campaign validation", () => {
  it("trims the name and keeps optional fields empty", () => {
    const result = createCampaignSchema.safeParse({
      name: "  Summer sale ",
      platform: "meta_ads",
      budget: "",
      description: "  ",
    });
    expect(result.success && result.data).toEqual({
      name: "Summer sale",
      platform: "meta_ads",
      budget: null,
      description: null,
    });
  });

  it("requires a name and a known platform", () => {
    const result = createCampaignSchema.safeParse({ name: "   ", platform: "x", budget: "", description: "" });
    expect(messages(result)).toEqual(["יש להזין שם קמפיין", "יש לבחור פלטפורמה"]);
  });

  it("rejects a negative budget and an unknown status", () => {
    expect(
      messages(createCampaignSchema.safeParse({ name: "A", platform: "google_ads", budget: "-1", description: "" })),
    ).toEqual(["יש להזין מספר שאינו שלילי"]);
    expect(
      messages(updateCampaignSchema.safeParse({ name: "A", platform: "google_ads", status: "x", description: "" })),
    ).toEqual(["יש לבחור סטטוס"]);
  });
});

describe("weekly row validation", () => {
  it("normalizes the date to Sunday and keeps empty fields as not entered", () => {
    const result = weekSchema.safeParse({ ...emptyWeek, spend: "1,200.5", leads: "10" });
    expect(result.success && result.data).toEqual({
      date: "2026-10-25",
      spend: 1200.5,
      leads: 10,
      deals: null,
      new_customers: null,
      revenue: null,
    });
  });

  it("needs at least one value", () => {
    const result = weekSchema.safeParse(emptyWeek);
    expect(messages(result)).toEqual([AT_LEAST_ONE_FIELD_MESSAGE]);
  });

  it("accepts 0 as an entered value", () => {
    const result = weekSchema.safeParse({ ...emptyWeek, deals: "0" });
    expect(result.success && result.data.deals).toBe(0);
  });

  it("rejects negative values and fractions in counts", () => {
    expect(messages(weekSchema.safeParse({ ...emptyWeek, revenue: "-5" }))).toEqual(["יש להזין מספר שאינו שלילי"]);
    for (const field of ["leads", "deals", "new_customers"]) {
      expect(messages(weekSchema.safeParse({ ...emptyWeek, [field]: "2.5" }))).toEqual(["יש להזין מספר שלם"]);
    }
  });

  it("requires a valid date", () => {
    expect(messages(weekSchema.safeParse({ ...emptyWeek, date: "", spend: "1" }))).toEqual(["יש לבחור תאריך"]);
  });
});
