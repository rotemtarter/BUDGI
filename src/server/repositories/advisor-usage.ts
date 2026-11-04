import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates/week";

// Daily question counter of the AI Budget Advisor (PRD 4.7, ADR-12). Users
// can only read it; advisor_record_question() is the only way to change it.

// Questions answered today (Israel time)
export async function getTodayUsage(now: Date = new Date()): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("advisor_usage")
    .select("question_count")
    .eq("usage_date", today(now))
    .maybeSingle();
  if (error) throw error;
  return data?.question_count ?? 0;
}

// One question at a time per user (ADR-14): the token, or null while another
// question is being answered. The token never leaves the server.
export async function acquireLock(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("advisor_acquire_lock");
  if (error) throw error;
  return data ?? null;
}

export async function releaseLock(token: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("advisor_release_lock", { p_token: token });
  if (error) throw error;
}

// Counts one answered question; returns today's new count (at most 20)
export async function recordQuestion(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("advisor_record_question");
  if (error) throw error;
  return data;
}
