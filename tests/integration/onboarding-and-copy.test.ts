import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { resetTestUser, signInTestUser } from "../support/test-users";

// Runs against budgi-dev as test user B
let b: { client: SupabaseClient<Database>; userId: string };

beforeAll(async () => {
  b = await signInTestUser("B");
  await resetTestUser(b.client, b.userId);
});

afterAll(async () => {
  await resetTestUser(b.client, b.userId);
});

async function budgetFor(month: string) {
  const { data } = await b.client.from("budgets").select("planned_amount").eq("month", month);
  return data?.map((r) => Number(r.planned_amount)) ?? [];
}

async function goalsFor(month: string) {
  const { data } = await b.client
    .from("business_goals")
    .select("goal_type, target_value")
    .eq("month", month)
    .order("goal_type");
  return data?.map((r) => [r.goal_type, r.target_value === null ? null : Number(r.target_value)]) ?? [];
}

describe("complete_onboarding", () => {
  it("saves the budget and revenue goal and finishes onboarding", async () => {
    const { error } = await b.client.rpc("complete_onboarding", {
      p_month: "2031-01-01",
      p_budget: 12500,
      p_revenue_goal: 40000,
    });
    expect(error).toBeNull();
    expect(await budgetFor("2031-01-01")).toEqual([12500]);
    expect(await goalsFor("2031-01-01")).toEqual([["revenue", 40000]]);

    const { data } = await b.client.from("profiles").select("onboarding_completed_at").single();
    expect(data?.onboarding_completed_at).not.toBeNull();
  });

  it("rejects a month that is not the first day", async () => {
    const { error } = await b.client.rpc("complete_onboarding", {
      p_month: "2031-01-15",
      p_budget: 1,
      p_revenue_goal: 1,
    });
    expect(error?.code).toBe("23514");
  });
});

describe("ensure_month_defaults (copy to a new month)", () => {
  it("copies the budget and all goals, including empty ones, from the latest earlier month", async () => {
    await b.client.from("business_goals").upsert(
      [
        { user_id: b.userId, month: "2031-01-01", goal_type: "deals", target_value: 12 },
        { user_id: b.userId, month: "2031-01-01", goal_type: "leads", target_value: null },
      ],
      { onConflict: "user_id,month,goal_type" },
    );

    // Skip a month: March copies from January, the latest defined month
    const { error } = await b.client.rpc("ensure_month_defaults", { p_month: "2031-03-01" });
    expect(error).toBeNull();
    expect(await budgetFor("2031-03-01")).toEqual([12500]);
    expect(await goalsFor("2031-03-01")).toEqual([
      ["deals", 12],
      ["leads", null],
      ["revenue", 40000],
    ]);
  });

  it("does not overwrite a month that is already defined", async () => {
    await b.client.from("budgets").update({ planned_amount: 999 }).eq("month", "2031-03-01");
    await b.client
      .from("business_goals")
      .update({ target_value: 1 })
      .eq("month", "2031-03-01")
      .eq("goal_type", "revenue");

    await b.client.rpc("ensure_month_defaults", { p_month: "2031-03-01" });
    expect(await budgetFor("2031-03-01")).toEqual([999]);
    expect((await goalsFor("2031-03-01")).find(([t]) => t === "revenue")).toEqual(["revenue", 1]);
  });

  it("copies from the latest earlier month, not from the first one", async () => {
    await b.client.rpc("ensure_month_defaults", { p_month: "2031-04-01" });
    expect(await budgetFor("2031-04-01")).toEqual([999]);
  });

  it("creates nothing when there is no earlier month", async () => {
    await b.client.rpc("ensure_month_defaults", { p_month: "2030-06-01" });
    expect(await budgetFor("2030-06-01")).toEqual([]);
    expect(await goalsFor("2030-06-01")).toEqual([]);
  });
});
