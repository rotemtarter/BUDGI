import { describe, expect, it } from "vitest";
import { authErrorMessage, safeNext, signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("email auth validation (ADR-21)", () => {
  it("checks the email and the password length and match", () => {
    expect(signUpSchema.safeParse({ email: " a@b.co ", password: "123456789012345", confirm: "123456789012345" }).success).toBe(true);
    expect(signUpSchema.safeParse({ email: "a@b", password: "123456789012345", confirm: "123456789012345" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "12345678901234", confirm: "12345678901234" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "123456789012345", confirm: "123456789012346" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("allows only known pages after an email link", () => {
    expect(safeNext("/reset-password")).toBe("/reset-password");
    expect(safeNext("/onboarding")).toBe("/onboarding");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });

  it("explains Supabase errors in Hebrew", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("האימייל או הסיסמה שגויים");
    expect(authErrorMessage("email_not_confirmed")).toContain("לאשר");
    expect(authErrorMessage("something_new")).toBe("משהו השתבש. נסה שוב.");
  });
});
