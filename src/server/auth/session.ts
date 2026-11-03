import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  displayName: string | null;
  // Shown in the header instead of the Google name, when set
  businessName: string | null;
  email: string | null;
  onboarded: boolean;
};

// Data Access Layer: the one place that reads the session (ARCHITECTURE.md 6.1).
// Cached per request, so several components can call it.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, business_name, email, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    displayName: profile?.display_name ?? null,
    businessName: profile?.business_name ?? null,
    email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
    onboarded: Boolean(profile?.onboarding_completed_at),
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// For every screen inside the Shell: signed in and finished onboarding
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  return user;
}
