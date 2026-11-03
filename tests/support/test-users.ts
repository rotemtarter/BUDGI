import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// The two fixed test users of budgi-dev (ARCHITECTURE.md 6.1, ADR-3).
// Credentials come from .env; they are never printed.
export type TestUserKey = "A" | "B";

export function testUserCredentials(key: TestUserKey) {
  const email = process.env[`E2E_USER_${key}_EMAIL`];
  const password = process.env[`E2E_USER_${key}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`Missing E2E_USER_${key}_EMAIL / E2E_USER_${key}_PASSWORD in .env`);
  }
  return { email, password };
}

function newClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase settings in .env");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient<Database> {
  return newClient();
}

export async function signInTestUser(key: TestUserKey) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword(testUserCredentials(key));
  if (error || !data.user) throw new Error(`Sign-in failed for test user ${key}: ${error?.message}`);
  return { client, userId: data.user.id };
}

// Removes the user's budgets and goals and marks onboarding as not done
export async function resetTestUser(client: SupabaseClient<Database>, userId: string) {
  const goals = await client.from("business_goals").delete().eq("user_id", userId);
  if (goals.error) throw goals.error;
  const budgets = await client.from("budgets").delete().eq("user_id", userId);
  if (budgets.error) throw budgets.error;
  const profile = await client
    .from("profiles")
    .update({ onboarding_completed_at: null })
    .eq("id", userId);
  if (profile.error) throw profile.error;
}
