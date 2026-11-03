import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { resetTestUser, signInTestUser, type TestUserKey, testUserCredentials } from "../support/test-users";

export const AUTH_FILE = "tests/e2e/.auth/user-a.json";

// Signs a test user in with Email/Password (budgi-dev only, ADR-3) and returns
// the same session cookies the app sets after Google sign-in.
export async function sessionCookies(key: TestUserKey, baseURL: string) {
  const jar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword(testUserCredentials(key));
  if (error) throw new Error(`Sign-in failed for test user ${key}: ${error.message}`);

  const { hostname } = new URL(baseURL);
  return [...jar].map(([name, value]) => ({
    name,
    value,
    domain: hostname,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + 60 * 60,
  }));
}

export async function signInContext(context: BrowserContext, key: TestUserKey, baseURL: string) {
  await context.clearCookies();
  await context.addCookies(await sessionCookies(key, baseURL));
}

// Puts test user A back to "new user": no budgets, no goals, onboarding not done
export async function resetUserA() {
  const { client, userId } = await signInTestUser("A");
  await resetTestUser(client, userId);
}

// Makes sure test user A has finished onboarding (for tests that start inside the app)
export async function ensureUserAOnboarded() {
  const { client } = await signInTestUser("A");
  const { data } = await client.from("profiles").select("onboarding_completed_at").single();
  if (data?.onboarding_completed_at) return;
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const { error } = await client.rpc("complete_onboarding", {
    p_month: `${month}-01`,
    p_budget: 10000,
    p_revenue_goal: 30000,
  });
  if (error) throw error;
}

// Removes test user A's alerts, campaigns and weekly data, keeping onboarding and goals
export async function resetUserACampaigns() {
  const { client, userId } = await signInTestUser("A");
  for (const table of ["alerts", "alert_settings", "campaign_performance", "campaign_budgets", "campaigns"] as const) {
    const { error } = await client.from(table).delete().eq("user_id", userId);
    if (error) throw error;
  }
}
