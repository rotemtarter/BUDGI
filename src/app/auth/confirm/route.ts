import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

// Links in Budgi's emails (ADR-21): confirming a new address, or resetting a
// password. Works with Supabase's email templates in either form: a one-time
// `token_hash` (any browser) or a PKCE `code` (the same browser).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const target = ok ? next : next === "/reset-password" ? "/forgot-password?error=1" : "/login?error=link";
  const response = NextResponse.redirect(new URL(target, origin));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
