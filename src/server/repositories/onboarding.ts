import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Saves the first monthly budget and revenue goal and marks onboarding done,
// in one database transaction.
export async function completeOnboarding(month: string, budget: number, revenueGoal: number) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_month: month,
    p_budget: budget,
    p_revenue_goal: revenueGoal,
  });
  if (error) throw error;
}
