import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonClient, resetTestUser, signInTestUser } from "../support/test-users";

// User A must never read or change user B's data, and vice versa (ARCHITECTURE.md 6.2)
const MONTH = "2031-01-01";

let a: { client: SupabaseClient<Database>; userId: string };
let b: { client: SupabaseClient<Database>; userId: string };
let aBudgetId: string;
let aGoalId: string;
let aCampaignId: string;
let aCampaignBudgetId: string;
let aWeekId: string;

beforeAll(async () => {
  a = await signInTestUser("A");
  b = await signInTestUser("B");
  await resetTestUser(a.client, a.userId);

  const budget = await a.client
    .from("budgets")
    .insert({ month: MONTH, planned_amount: 1000 })
    .select("id")
    .single();
  if (budget.error) throw budget.error;
  aBudgetId = budget.data.id;

  const goal = await a.client
    .from("business_goals")
    .insert({ month: MONTH, goal_type: "revenue", target_value: 5000 })
    .select("id")
    .single();
  if (goal.error) throw goal.error;
  aGoalId = goal.data.id;

  const campaign = await a.client
    .from("campaigns")
    .insert({ name: "A campaign", platform: "google_ads" })
    .select("id")
    .single();
  if (campaign.error) throw campaign.error;
  aCampaignId = campaign.data.id;

  const campaignBudget = await a.client
    .from("campaign_budgets")
    .insert({ campaign_id: aCampaignId, month: MONTH, planned_amount: 500 })
    .select("id")
    .single();
  if (campaignBudget.error) throw campaignBudget.error;
  aCampaignBudgetId = campaignBudget.data.id;

  const week = await a.client
    .from("campaign_performance")
    .insert({ campaign_id: aCampaignId, week_start: "2031-01-05", spend: 100 })
    .select("id")
    .single();
  if (week.error) throw week.error;
  aWeekId = week.data.id;
});

afterAll(async () => {
  await resetTestUser(a.client, a.userId);
});

describe("RLS: budgets and business_goals", () => {
  it("B cannot read A's rows", async () => {
    const budgets = await b.client.from("budgets").select("id").eq("id", aBudgetId);
    expect(budgets.data).toEqual([]);
    const goals = await b.client.from("business_goals").select("id").eq("id", aGoalId);
    expect(goals.data).toEqual([]);
  });

  it("B cannot update A's rows", async () => {
    const budget = await b.client
      .from("budgets")
      .update({ planned_amount: 1 })
      .eq("id", aBudgetId)
      .select("id");
    expect(budget.data).toEqual([]);
    const goal = await b.client
      .from("business_goals")
      .update({ target_value: 1 })
      .eq("id", aGoalId)
      .select("id");
    expect(goal.data).toEqual([]);

    const check = await a.client.from("budgets").select("planned_amount").eq("id", aBudgetId).single();
    expect(Number(check.data?.planned_amount)).toBe(1000);
  });

  it("B cannot delete A's rows", async () => {
    await b.client.from("budgets").delete().eq("id", aBudgetId);
    await b.client.from("business_goals").delete().eq("id", aGoalId);

    const budgets = await a.client.from("budgets").select("id").eq("id", aBudgetId);
    expect(budgets.data).toHaveLength(1);
    const goals = await a.client.from("business_goals").select("id").eq("id", aGoalId);
    expect(goals.data).toHaveLength(1);
  });

  it("B cannot insert rows that belong to A", async () => {
    const budget = await b.client
      .from("budgets")
      .insert({ user_id: a.userId, month: "2031-02-01", planned_amount: 1 });
    expect(budget.error?.code).toBe("42501");
    const goal = await b.client
      .from("business_goals")
      .insert({ user_id: a.userId, month: "2031-02-01", goal_type: "deals", target_value: 1 });
    expect(goal.error?.code).toBe("42501");
  });

  it("B cannot move its own row to A", async () => {
    const own = await b.client
      .from("budgets")
      .insert({ month: "2031-03-01", planned_amount: 1 })
      .select("id")
      .single();
    expect(own.error).toBeNull();
    const moved = await b.client
      .from("budgets")
      .update({ user_id: a.userId })
      .eq("id", own.data!.id);
    expect(moved.error?.code).toBe("42501");
    await b.client.from("budgets").delete().eq("id", own.data!.id);
  });

  it("anonymous visitors cannot read anything", async () => {
    const anon = anonClient();
    for (const table of [
      "budgets",
      "business_goals",
      "profiles",
      "campaigns",
      "campaign_budgets",
      "campaign_performance",
    ] as const) {
      const result = await anon.from(table).select("*");
      expect(result.data ?? []).toEqual([]);
    }
    const rpc = await anon.rpc("ensure_month_defaults", { p_month: MONTH });
    expect(rpc.error?.code).toBe("42501");

    // Supabase's helper behind automatic RLS on new tables is not callable from the API
    // (not in the generated types, so called by name)
    for (const client of [anon, b.client]) {
      const callable = client as unknown as { rpc: (fn: string) => Promise<{ error: { code?: string } | null }> };
      const helper = await callable.rpc("rls_auto_enable");
      expect(helper.error?.code).toBe("42501");
    }
  });
});

describe("RLS: profiles", () => {
  it("each user sees only their own profile", async () => {
    const { data } = await b.client.from("profiles").select("id");
    expect(data).toEqual([{ id: b.userId }]);
  });

  it("B cannot change A's profile", async () => {
    const result = await b.client
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", a.userId)
      .select("id");
    expect(result.data).toEqual([]);
  });

  it("each user sets only their own business name, within the rules", async () => {
    expect((await a.client.from("profiles").update({ business_name: "העסק של A" }).eq("id", a.userId)).error).toBeNull();
    await b.client.from("profiles").update({ business_name: "not mine" }).eq("id", a.userId);
    const mine = await a.client.from("profiles").select("business_name").eq("id", a.userId).single();
    expect(mine.data?.business_name).toBe("העסק של A");

    // Trimmed and up to 100 characters (the app trims before saving)
    expect((await a.client.from("profiles").update({ business_name: " x " }).eq("id", a.userId)).error?.code).toBe("23514");
    expect((await a.client.from("profiles").update({ business_name: "x".repeat(101) }).eq("id", a.userId)).error?.code).toBe("23514");
    expect((await a.client.from("profiles").update({ business_name: null }).eq("id", a.userId)).error).toBeNull();
  });

  it("name and email are read-only", async () => {
    const result = await a.client.from("profiles").update({ display_name: "x" }).eq("id", a.userId);
    expect(result.error?.code).toBe("42501");
  });
});

describe("RLS: campaigns, campaign budgets and weekly rows", () => {
  it("B cannot read A's rows", async () => {
    expect((await b.client.from("campaigns").select("id").eq("id", aCampaignId)).data).toEqual([]);
    expect((await b.client.from("campaign_budgets").select("id").eq("id", aCampaignBudgetId)).data).toEqual([]);
    expect((await b.client.from("campaign_performance").select("id").eq("id", aWeekId)).data).toEqual([]);
  });

  it("B cannot update A's rows", async () => {
    const campaign = await b.client.from("campaigns").update({ name: "x" }).eq("id", aCampaignId).select("id");
    expect(campaign.data).toEqual([]);
    const budget = await b.client
      .from("campaign_budgets")
      .update({ planned_amount: 1 })
      .eq("id", aCampaignBudgetId)
      .select("id");
    expect(budget.data).toEqual([]);
    const week = await b.client.from("campaign_performance").update({ spend: 1 }).eq("id", aWeekId).select("id");
    expect(week.data).toEqual([]);

    const check = await a.client.from("campaign_performance").select("spend").eq("id", aWeekId).single();
    expect(Number(check.data?.spend)).toBe(100);
  });

  it("B cannot delete A's rows", async () => {
    await b.client.from("campaign_performance").delete().eq("id", aWeekId);
    await b.client.from("campaign_budgets").delete().eq("id", aCampaignBudgetId);
    await b.client.from("campaigns").delete().eq("id", aCampaignId);

    expect((await a.client.from("campaign_performance").select("id").eq("id", aWeekId)).data).toHaveLength(1);
    expect((await a.client.from("campaign_budgets").select("id").eq("id", aCampaignBudgetId)).data).toHaveLength(1);
    expect((await a.client.from("campaigns").select("id").eq("id", aCampaignId)).data).toHaveLength(1);
  });

  it("B cannot add a week or a budget to A's campaign", async () => {
    // As B's own row: the campaign is not B's, so the composite foreign key fails
    const ownWeek = await b.client
      .from("campaign_performance")
      .insert({ campaign_id: aCampaignId, week_start: "2031-01-12", spend: 1 });
    expect(ownWeek.error).not.toBeNull();
    const ownBudget = await b.client
      .from("campaign_budgets")
      .insert({ campaign_id: aCampaignId, month: "2031-02-01", planned_amount: 1 });
    expect(ownBudget.error).not.toBeNull();

    // As A's row: blocked by RLS
    const asA = await b.client
      .from("campaign_performance")
      .insert({ user_id: a.userId, campaign_id: aCampaignId, week_start: "2031-01-12", spend: 1 });
    expect(asA.error?.code).toBe("42501");

    const weeks = await a.client.from("campaign_performance").select("id").eq("campaign_id", aCampaignId);
    expect(weeks.data).toHaveLength(1);
  });

  it("B cannot create a campaign for A", async () => {
    const result = await b.client
      .from("campaigns")
      .insert({ user_id: a.userId, name: "Not mine", platform: "meta_ads" });
    expect(result.error?.code).toBe("42501");
  });
});

describe("RLS: import_jobs and commit_import", () => {
  it("B cannot read A's import jobs or add one for A", async () => {
    const job = await a.client
      .from("import_jobs")
      .insert({ file_name: "a.csv", status: "failed" })
      .select("id")
      .single();
    expect(job.error).toBeNull();

    expect((await b.client.from("import_jobs").select("id").eq("id", job.data!.id)).data).toHaveLength(0);
    const asA = await b.client.from("import_jobs").insert({ user_id: a.userId, file_name: "x.csv", status: "failed" });
    expect(asA.error?.code).toBe("42501");
  });

  it("an import by B only touches B's own campaigns", async () => {
    const { error } = await b.client.rpc("commit_import", {
      p_file_name: "b.csv",
      p_rows: [{ name: "A campaign", platform: "google_ads", week_start: "2031-01-05", spend: 999 }],
      p_rows_total: 1,
      p_rows_rejected: 0,
      p_errors: [],
    });
    expect(error).toBeNull();
    // A's week with the same campaign name and week is unchanged
    const week = await a.client.from("campaign_performance").select("spend").eq("id", aWeekId).single();
    expect(week.data?.spend).toBe(100);
    await resetTestUser(b.client, b.userId);
  });

  it("anonymous visitors cannot import or read import jobs", async () => {
    const anon = anonClient();
    const result = await anon.rpc("commit_import", {
      p_file_name: "x.csv",
      p_rows: [{ name: "X", platform: "meta_ads", week_start: "2031-01-05", spend: 1 }],
      p_rows_total: 1,
      p_rows_rejected: 0,
      p_errors: [],
    });
    expect(result.error).not.toBeNull();
    expect((await anon.from("import_jobs").select("id")).data ?? []).toHaveLength(0);
  });
});

describe("RLS: alerts and alert_settings", () => {
  let aAlertId: string;
  let aSettingId: string;

  beforeAll(async () => {
    const alert = await a.client
      .from("alerts")
      .insert({
        alert_type: "budget_overrun",
        severity: "critical",
        title: "חריגה מהתקציב",
        description: "בדיקה",
        related_campaign_id: aCampaignId,
        month: MONTH,
        dedupe_key: `budget_overrun:${aCampaignId}:${MONTH}`,
        deviation: 10,
      })
      .select("id")
      .single();
    if (alert.error) throw alert.error;
    aAlertId = alert.data.id;

    const setting = await a.client
      .from("alert_settings")
      .insert({ alert_type: "spend_pace", threshold_config: { percent: 20 }, enabled: false })
      .select("id")
      .single();
    if (setting.error) throw setting.error;
    aSettingId = setting.data.id;
  });

  it("B cannot read A's alerts or settings", async () => {
    expect((await b.client.from("alerts").select("id").eq("id", aAlertId)).data).toEqual([]);
    expect((await b.client.from("alert_settings").select("id").eq("id", aSettingId)).data).toEqual([]);
  });

  it("B cannot mark A's alert as read, change A's settings or delete them", async () => {
    const read = await b.client.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", aAlertId).select("id");
    expect(read.data).toEqual([]);
    const setting = await b.client.from("alert_settings").update({ enabled: true }).eq("id", aSettingId).select("id");
    expect(setting.data).toEqual([]);
    await b.client.from("alerts").delete().eq("id", aAlertId);
    await b.client.from("alert_settings").delete().eq("id", aSettingId);

    const alert = await a.client.from("alerts").select("read_at").eq("id", aAlertId).single();
    expect(alert.data?.read_at).toBeNull();
    const own = await a.client.from("alert_settings").select("enabled").eq("id", aSettingId).single();
    expect(own.data?.enabled).toBe(false);
  });

  it("B cannot create alerts or settings for A, or point an alert at A's campaign", async () => {
    const asA = await b.client.from("alerts").insert({
      user_id: a.userId,
      alert_type: "spend_pace",
      severity: "warning",
      title: "x",
      description: "x",
      month: MONTH,
      dedupe_key: "x",
    });
    expect(asA.error?.code).toBe("42501");
    const onACampaign = await b.client.from("alerts").insert({
      alert_type: "spend_pace",
      severity: "warning",
      title: "x",
      description: "x",
      related_campaign_id: aCampaignId,
      month: MONTH,
      dedupe_key: "x",
    });
    expect(onACampaign.error?.code).toBe("42501");
    const settingForA = await b.client.from("alert_settings").insert({ user_id: a.userId, alert_type: "goal_risk" });
    expect(settingForA.error?.code).toBe("42501");
  });

  it("A can mark an alert as read but change nothing else in it", async () => {
    const title = await a.client.from("alerts").update({ title: "שונה" }).eq("id", aAlertId);
    expect(title.error?.code).toBe("42501");
    const read = await a.client
      .from("alerts")
      .update({ read_at: new Date().toISOString() })
      .eq("id", aAlertId)
      .select("read_at")
      .single();
    expect(read.data?.read_at).not.toBeNull();
  });

  it("anonymous visitors cannot read alerts or settings", async () => {
    const anon = anonClient();
    expect((await anon.from("alerts").select("id")).data ?? []).toHaveLength(0);
    expect((await anon.from("alert_settings").select("id")).data ?? []).toHaveLength(0);
  });
});
