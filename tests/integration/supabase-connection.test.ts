import { describe, expect, it } from "vitest";
import { checkSupabaseHealth } from "@/lib/supabase/health";

describe("Supabase connection (budgi-dev)", () => {
  it("reaches the project with the configured key", async () => {
    expect(await checkSupabaseHealth()).toBe("ok");
  });
});
