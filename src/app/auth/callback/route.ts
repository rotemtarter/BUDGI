import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Google OAuth returns here with a one-time code. Exchange it for a session,
// then send the user to onboarding or home (DESIGN.md 1.1).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const failed = NextResponse.redirect(new URL("/login?error=1", origin));

  if (!code) return failed;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failed;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", data.user.id)
    .maybeSingle();

  const next = profile?.onboarding_completed_at ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(new URL(next, origin));
}
