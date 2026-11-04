import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { signInTestUser } from "../support/test-users";

// The forms' length limits also hold for a request that skips the app and
// writes to budgi-dev directly (security review, ADR-14). As test user B.
let b: { client: SupabaseClient<Database>; userId: string };

beforeAll(async () => {
  b = await signInTestUser("B");
});

afterAll(async () => {
  await b.client.from("campaigns").delete().eq("user_id", b.userId).like("name", "Limit %");
  await b.client.from("alert_settings").delete().eq("user_id", b.userId);
});

describe("length limits in the database", () => {
  it("rejects a campaign name over 100 characters and a description over 500", async () => {
    const longName = await b.client
      .from("campaigns")
      .insert({ user_id: b.userId, name: `Limit ${"א".repeat(95)}`, platform: "meta_ads" });
    expect(longName.error).not.toBeNull();

    const longDescription = await b.client
      .from("campaigns")
      .insert({ user_id: b.userId, name: "Limit description", platform: "meta_ads", description: "א".repeat(501) });
    expect(longDescription.error).not.toBeNull();

    const ok = await b.client
      .from("campaigns")
      .insert({ user_id: b.userId, name: `Limit ${"א".repeat(94)}`, platform: "meta_ads", description: "א".repeat(500) });
    expect(ok.error).toBeNull();
  });

  it("rejects oversized alert settings", async () => {
    const { error } = await b.client
      .from("alert_settings")
      .insert({ user_id: b.userId, alert_type: "spend_pace", threshold_config: { percent: 10, junk: "x".repeat(2000) } });
    expect(error).not.toBeNull();
  });
});
