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
    for (const table of ["budgets", "business_goals", "profiles"] as const) {
      const result = await anon.from(table).select("*");
      expect(result.data ?? []).toEqual([]);
    }
    const rpc = await anon.rpc("ensure_month_defaults", { p_month: MONTH });
    expect(rpc.error?.code).toBe("42501");
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

  it("name and email are read-only", async () => {
    const result = await a.client.from("profiles").update({ display_name: "x" }).eq("id", a.userId);
    expect(result.error?.code).toBe("42501");
  });
});
