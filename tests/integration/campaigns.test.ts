import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resetTestUser, signInTestUser } from "../support/test-users";

// Database rules for campaigns and weekly rows (ARCHITECTURE.md 3.4), as test user B
let b: { client: SupabaseClient<Database>; userId: string };

beforeAll(async () => {
  b = await signInTestUser("B");
});

beforeEach(async () => {
  await resetTestUser(b.client, b.userId);
});

afterAll(async () => {
  await resetTestUser(b.client, b.userId);
});

async function newCampaign(name: string, platform = "meta_ads", status = "active") {
  const { data, error } = await b.client
    .from("campaigns")
    .insert({ name, platform, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

describe("campaigns", () => {
  it("rejects the same name on the same platform, ignoring case and spaces", async () => {
    await newCampaign("Summer Sale");
    const duplicate = await b.client.from("campaigns").insert({ name: "summer sale", platform: "meta_ads" });
    expect(duplicate.error?.code).toBe("23505");
    // The app trims names; the database rejects untrimmed ones
    const untrimmed = await b.client.from("campaigns").insert({ name: " Summer Sale ", platform: "meta_ads" });
    expect(untrimmed.error?.code).toBe("23514");
  });

  it("allows the same name on another platform", async () => {
    await newCampaign("Summer Sale");
    const other = await b.client.from("campaigns").insert({ name: "Summer Sale", platform: "google_ads" });
    expect(other.error).toBeNull();
  });

  it("rejects an unknown platform or status", async () => {
    expect((await b.client.from("campaigns").insert({ name: "A", platform: "facebook" })).error?.code).toBe("23514");
    expect(
      (await b.client.from("campaigns").insert({ name: "A", platform: "meta_ads", status: "x" })).error?.code,
    ).toBe("23514");
  });

  it("can be deleted only while it has no weekly data", async () => {
    const id = await newCampaign("With data");
    await b.client.from("campaign_budgets").insert({ campaign_id: id, month: "2031-01-01", planned_amount: 100 });
    await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05", spend: 10 });

    const blocked = await b.client.from("campaigns").delete().eq("id", id);
    expect(blocked.error?.code).toBe("23503");

    await b.client.from("campaign_performance").delete().eq("campaign_id", id);
    const deleted = await b.client.from("campaigns").delete().eq("id", id).select("id");
    expect(deleted.error).toBeNull();
    expect(deleted.data).toHaveLength(1);
    // Its budgets go with it
    const budgets = await b.client.from("campaign_budgets").select("id").eq("campaign_id", id);
    expect(budgets.data).toEqual([]);
  });
});

describe("weekly rows", () => {
  it("allows one row per campaign per week", async () => {
    const id = await newCampaign("Weeks");
    expect((await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05", leads: 3 })).error).toBeNull();
    const again = await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05", leads: 4 });
    expect(again.error?.code).toBe("23505");
  });

  it("stores the week by its Sunday", async () => {
    const id = await newCampaign("Weeks");
    const monday = await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-06", leads: 1 });
    expect(monday.error?.code).toBe("23514");
  });

  it("needs at least one value, keeps empty fields as null and rejects negatives", async () => {
    const id = await newCampaign("Weeks");
    const empty = await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05" });
    expect(empty.error?.code).toBe("23514");

    const negative = await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05", spend: -1 });
    expect(negative.error?.code).toBe("23514");

    const saved = await b.client
      .from("campaign_performance")
      .insert({ campaign_id: id, week_start: "2031-01-05", deals: 0 })
      .select("spend, deals, source")
      .single();
    expect(saved.data).toEqual({ spend: null, deals: 0, source: "manual" });
  });

  it("rejects fractions in counts", async () => {
    const id = await newCampaign("Weeks");
    const fraction = await b.client.from("campaign_performance").insert({ campaign_id: id, week_start: "2031-01-05", leads: 2.5 });
    expect(fraction.error).not.toBeNull();
  });
});

describe("ensure_month_defaults: campaign budgets", () => {
  async function budgetsFor(month: string) {
    const { data } = await b.client
      .from("campaign_budgets")
      .select("campaign_id, planned_amount")
      .eq("month", month);
    return new Map(data?.map((r) => [r.campaign_id, r.planned_amount === null ? null : Number(r.planned_amount)]));
  }

  it("copies the latest budget of active campaigns only, without overwriting", async () => {
    const active = await newCampaign("Active");
    const paused = await newCampaign("Paused", "meta_ads", "paused");
    const cleared = await newCampaign("Cleared");
    const defined = await newCampaign("Defined");
    await b.client.from("campaign_budgets").insert([
      { campaign_id: active, month: "2031-01-01", planned_amount: 100 },
      { campaign_id: active, month: "2031-02-01", planned_amount: 200 },
      { campaign_id: paused, month: "2031-02-01", planned_amount: 300 },
      { campaign_id: cleared, month: "2031-02-01", planned_amount: null },
      { campaign_id: defined, month: "2031-02-01", planned_amount: 400 },
      { campaign_id: defined, month: "2031-04-01", planned_amount: 1 },
    ]);

    const { error } = await b.client.rpc("ensure_month_defaults", { p_month: "2031-04-01" });
    expect(error).toBeNull();
    const april = await budgetsFor("2031-04-01");
    expect(april.get(active)).toBe(200); // from February, the latest earlier month
    expect(april.has(paused)).toBe(false); // not active
    expect(april.get(cleared)).toBeNull(); // "no budget" stays empty
    expect(april.get(defined)).toBe(1); // already defined, not overwritten
  });
});
