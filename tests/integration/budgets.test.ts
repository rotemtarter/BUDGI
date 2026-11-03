import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resetTestUser, signInTestUser } from "../support/test-users";

// Saving budgets on the budget screen (DESIGN.md 1.6), as test user B. The
// writes match src/server/repositories/budgets.ts and campaigns.ts.
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

const MONTH = "2030-10-01";

async function saveTotal(amount: number) {
  const { error } = await b.client
    .from("budgets")
    .upsert({ user_id: b.userId, month: MONTH, planned_amount: amount }, { onConflict: "user_id,month" });
  if (error) throw error;
}

async function saveCampaignBudget(campaignId: string, amount: number | null) {
  const { error } = await b.client
    .from("campaign_budgets")
    .upsert(
      { user_id: b.userId, campaign_id: campaignId, month: MONTH, planned_amount: amount },
      { onConflict: "campaign_id,month" },
    );
  if (error) throw error;
}

describe("budgets for a month", () => {
  it("saves and updates the total budget without a second row", async () => {
    await saveTotal(20000);
    await saveTotal(18500.5);
    const { data } = await b.client.from("budgets").select("planned_amount").eq("month", MONTH);
    expect(data).toHaveLength(1);
    expect(Number(data![0].planned_amount)).toBe(18500.5);
  });

  it("saves, updates and empties a campaign's budget", async () => {
    const { data: campaign, error } = await b.client
      .from("campaigns")
      .insert({ name: "Budget Test", platform: "google_ads" })
      .select("id")
      .single();
    if (error) throw error;

    await saveCampaignBudget(campaign.id, 5000);
    await saveCampaignBudget(campaign.id, 6000);
    let rows = await b.client.from("campaign_budgets").select("planned_amount").eq("campaign_id", campaign.id);
    expect(rows.data).toHaveLength(1);
    expect(Number(rows.data![0].planned_amount)).toBe(6000);

    // Empty = no budget this month; the row stays so it is not copied again (ADR-7)
    await saveCampaignBudget(campaign.id, null);
    rows = await b.client.from("campaign_budgets").select("planned_amount").eq("campaign_id", campaign.id);
    expect(rows.data).toEqual([{ planned_amount: null }]);
  });

  it("rejects a negative total budget", async () => {
    const { error } = await b.client
      .from("budgets")
      .upsert({ user_id: b.userId, month: MONTH, planned_amount: -1 }, { onConflict: "user_id,month" });
    expect(error?.code).toBe("23514");
  });
});
