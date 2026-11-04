import { describe, expect, it } from "vitest";
import { deleteAccountSchema, isDeleteConfirmed } from "@/lib/validation/account";

describe("account deletion confirmation", () => {
  it("accepts only the word מחק, ignoring surrounding spaces", () => {
    expect(isDeleteConfirmed("מחק")).toBe(true);
    expect(isDeleteConfirmed("  מחק ")).toBe(true);
    expect(isDeleteConfirmed("")).toBe(false);
    expect(isDeleteConfirmed("מחיקה")).toBe(false);
    expect(isDeleteConfirmed("delete")).toBe(false);
  });

  it("checks the request body", () => {
    expect(deleteAccountSchema.safeParse({ confirm: "מחק" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirm: "לא" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
    expect(deleteAccountSchema.safeParse(null).success).toBe(false);
  });
});
