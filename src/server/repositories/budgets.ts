import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Total marketing budget for the month, after copying it from the latest
// earlier month if this month has none yet (PRD 4.2). null = never defined.
export async function getMonthBudget(month: string): Promise<number | null> {
  const supabase = await createSupabaseServerClient();
  const { error: copyError } = await supabase.rpc("ensure_month_defaults", { p_month: month });
  if (copyError) throw copyError;

  const { data, error } = await supabase
    .from("budgets")
    .select("planned_amount")
    .eq("month", month)
    .maybeSingle();
  if (error) throw error;
  return data ? Number(data.planned_amount) : null;
}

export async function saveMonthBudget(userId: string, month: string, amount: number) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("budgets")
    .upsert({ user_id: userId, month, planned_amount: amount }, { onConflict: "user_id,month" });
  if (error) throw error;
}
