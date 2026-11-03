import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GOAL_TYPES, type GoalType } from "@/lib/validation/goals";

export type MonthGoals = Record<GoalType, number | null>;

// Goals for one month, after copying them from the latest earlier month if
// this month has none yet (PRD 4.2, ARCHITECTURE.md 3.2).
export async function getGoalsForMonth(month: string): Promise<MonthGoals> {
  const supabase = await createSupabaseServerClient();

  const { error: copyError } = await supabase.rpc("ensure_month_defaults", { p_month: month });
  if (copyError) throw copyError;

  const { data, error } = await supabase
    .from("business_goals")
    .select("goal_type, target_value")
    .eq("month", month);
  if (error) throw error;

  const goals = Object.fromEntries(GOAL_TYPES.map((t) => [t, null])) as MonthGoals;
  for (const row of data) {
    if ((GOAL_TYPES as readonly string[]).includes(row.goal_type)) {
      goals[row.goal_type as GoalType] = row.target_value === null ? null : Number(row.target_value);
    }
  }
  return goals;
}

// First month the user defined goals for (their onboarding month), or null
export async function getFirstGoalMonth(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_goals")
    .select("month")
    .order("month", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.month ?? null;
}

// Saves all four goals for the month; null keeps a row meaning "no goal" (ADR-6)
export async function saveGoalsForMonth(userId: string, month: string, goals: MonthGoals) {
  const supabase = await createSupabaseServerClient();
  const rows = GOAL_TYPES.map((goalType) => ({
    user_id: userId,
    month,
    goal_type: goalType,
    target_value: goals[goalType],
  }));
  const { error } = await supabase
    .from("business_goals")
    .upsert(rows, { onConflict: "user_id,month,goal_type" });
  if (error) throw error;
}
