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
const readSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { kind: "none" } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, business_name, email, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  // Every user has a profile (created with the user). None means the account
  // was deleted while this session's token is still valid (ADR-15).
  if (!profile) return { kind: "deleted" } as const;

  const user: CurrentUser = {
    id: userId,
    displayName: profile.display_name,
    businessName: profile.business_name,
    email: profile.email ?? (data.claims.email as string | undefined) ?? null,
    onboarded: Boolean(profile.onboarding_completed_at),
  };
  return { kind: "user", user } as const;
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  return session.kind === "user" ? session.user : null;
}

// Clears the cookies of a session whose account no longer exists. The proxy
// would otherwise send it from /login back into the app.
export const SIGN_OUT_PATH = "/auth/signout";

export async function requireUser(): Promise<CurrentUser> {
  const session = await readSession();
  if (session.kind === "deleted") redirect(SIGN_OUT_PATH);
  if (session.kind === "none") redirect("/login");
  return session.user;
}

// For every screen inside the Shell: signed in and finished onboarding
export async function requireOnboardedUser(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  return user;
}
