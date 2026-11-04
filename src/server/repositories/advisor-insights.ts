import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { advisorReplySchema, type AdvisorReply, type SavedInsight } from "@/lib/advisor/schema";

// Advisor answers the user chose to keep (PRD 4.7, ADR-13). RLS limits every
// query to the signed-in user.

// Newest first. A stored reply that no longer matches the schema is skipped.
// `limit`: only the newest ones (the home screen, DESIGN.md 1.3)
export async function listInsights({ limit }: { limit?: number } = {}): Promise<SavedInsight[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("advisor_insights")
    .select("id, question, reply, created_at")
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data.flatMap((row) => {
    const reply = advisorReplySchema.safeParse(row.reply);
    return reply.success ? [{ id: row.id, question: row.question, reply: reply.data, createdAt: row.created_at }] : [];
  });
}

export async function insertInsight(userId: string, question: string, reply: AdvisorReply): Promise<SavedInsight> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("advisor_insights")
    .insert({ user_id: userId, question, reply })
    .select("id, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, question, reply, createdAt: data.created_at };
}

// false when there was no such insight (or it belongs to someone else)
export async function deleteInsight(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("advisor_insights").delete().eq("id", id).select("id");
  if (error) throw error;
  return data.length > 0;
}
