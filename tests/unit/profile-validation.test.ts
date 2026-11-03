import { describe, expect, it } from "vitest";
import { businessNameSchema } from "@/lib/validation/profile";

describe("businessNameSchema", () => {
  it("trims the name, and empty means use the Google name", () => {
    expect(businessNameSchema.parse({ businessName: "  מאפיית רותם " })).toEqual({ businessName: "מאפיית רותם" });
    expect(businessNameSchema.parse({ businessName: "   " })).toEqual({ businessName: null });
  });

  it("allows up to 100 characters", () => {
    expect(businessNameSchema.safeParse({ businessName: "א".repeat(100) }).success).toBe(true);
    const tooLong = businessNameSchema.safeParse({ businessName: "א".repeat(101) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe("אפשר להזין עד 100 תווים");
  });
});
