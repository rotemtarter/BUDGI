import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

// Supabase client with the Service Role (Secret) Key. It bypasses RLS, so it
// is used for one task only: deleting a user from auth.users (ARCHITECTURE.md
// 6.2, 6.5). Never import it into client code or use it for regular queries.
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(supabaseEnv().url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
