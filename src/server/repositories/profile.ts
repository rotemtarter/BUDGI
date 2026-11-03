import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// null = no business name: the header shows the Google name
export async function saveBusinessName(userId: string, businessName: string | null) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ business_name: businessName }).eq("id", userId);
  if (error) throw error;
}
