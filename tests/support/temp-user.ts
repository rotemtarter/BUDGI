import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// A throwaway user in budgi-dev for the account-deletion tests (ADR-15), so
// the fixed test users A and B are never deleted. Uses the budgi-dev Service
// Role Key from .env; the password is random and never printed.

export const USER_TABLES = [
  "profiles",
  "budgets",
  "business_goals",
  "campaigns",
  "campaign_budgets",
  "campaign_performance",
  "import_jobs",
  "alert_settings",
  "alerts",
  "advisor_usage",
  "advisor_insights",
  "advisor_locks",
] as const;

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TempUser = { userId: string; email: string; password: string; client: SupabaseClient<Database> };

export async function createTempUser(): Promise<TempUser> {
  const email = `budgi-delete-${randomUUID()}@example.com`;
  const password = randomBytes(24).toString("base64url");
  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create a temporary user: ${error?.message}`);

  const client = createClient<Database>(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`Temporary user sign-in failed: ${signIn.error.message}`);
  return { userId: data.user.id, email, password, client };
}

// Safety net when a test fails half-way. Deleting a user that is gone is fine.
export async function removeTempUser(userId: string | undefined) {
  if (!userId) return;
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error && error.status !== 404) throw error;
}

function israelMonth() {
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  return `${month}-01`;
}

const check = <T extends { error: unknown }>(result: T) => {
  if (result.error) throw result.error;
  return result;
};

// Puts a row in every table the user can write to, through the user's own
// session (RLS), plus a counted Advisor question.
export async function seedEverything({ client, userId }: TempUser) {
  const month = israelMonth();
  check(await client.rpc("complete_onboarding", { p_month: month, p_budget: 5000, p_revenue_goal: 20000 }));
  const campaign = check(
    await client.from("campaigns").insert({ user_id: userId, name: "Delete Me", platform: "meta_ads" }).select("id").single(),
  ).data!;
  check(await client.from("campaign_budgets").insert({ user_id: userId, campaign_id: campaign.id, month, planned_amount: 2000 }));
  check(
    await client.from("campaign_performance").insert({
      user_id: userId,
      campaign_id: campaign.id,
      week_start: "2026-10-04",
      spend: 500,
      leads: 10,
    }),
  );
  check(await client.from("import_jobs").insert({ user_id: userId, file_name: "data.csv", status: "completed" }));
  check(
    await client.from("alert_settings").insert({ user_id: userId, alert_type: "spend_pace", enabled: false, threshold_config: { percent: 15 } }),
  );
  check(
    await client.from("alerts").insert({
      user_id: userId,
      alert_type: "budget_overrun",
      severity: "warning",
      title: "חריגה מהתקציב",
      description: "בדיקה",
      month,
      dedupe_key: `budget_overrun:business:${month}`,
    }),
  );
  check(
    await client.from("advisor_insights").insert({
      user_id: userId,
      question: "שאלה",
      reply: { answer: "תשובה", recommendations: [], limitations: [], missingDataRequest: null },
    }),
  );
  check(await client.rpc("advisor_record_question"));
  check(await client.rpc("advisor_acquire_lock"));
}

// Rows the user has in each table, read with the Service Role (RLS bypassed)
export async function countUserRows(userId: string) {
  const admin = adminClient();
  const counts: Record<string, number> = {};
  for (const table of USER_TABLES) {
    const column = table === "profiles" ? "id" : "user_id";
    // The tables have different columns; only the owner column is filtered on
    const { count, error } = await admin
      .from(table as "budgets")
      .select("*", { count: "exact", head: true })
      .eq(column as "user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
    counts[table] = count ?? 0;
  }
  return counts;
}

export async function authUserExists(userId: string) {
  const { data, error } = await adminClient().auth.admin.getUserById(userId);
  if (error && error.status !== 404) throw error;
  return Boolean(data?.user);
}
