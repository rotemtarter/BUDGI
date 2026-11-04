"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  authErrorMessage,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

// Email and password sign-in, sign-up and password reset (ADR-21). Every
// message is Hebrew; logs hold only the error code (ARCHITECTURE.md 8.2).

export type AuthResult = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): AuthResult {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0])] ??= issue.message;
  return { ok: false, message: Object.values(errors)[0] ?? "", fieldErrors: errors };
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return h.get("origin") ?? `${proto}://${host}`;
}

export async function signInWithEmailAction(input: unknown): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error?.code !== "invalid_credentials") console.error("signInWithEmail failed", { code: error?.code });
    return { ok: false, message: authErrorMessage(error?.code) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", data.user.id)
    .maybeSingle();
  redirect(profile?.onboarding_completed_at ? "/dashboard" : "/onboarding");
}

// A confirmation email is sent; the account works after its link is clicked.
// For an address that already has an account, Supabase answers the same way
// (so nobody can find out who is registered).
export async function signUpWithEmailAction(input: unknown): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await origin()}/auth/confirm?next=/onboarding` },
  });
  if (error) {
    console.error("signUpWithEmail failed", { code: error.code });
    return { ok: false, message: authErrorMessage(error.code) };
  }
  // With "Confirm email" off in Supabase the user is signed in right away
  if (data.session) redirect("/onboarding");
  return { ok: true };
}

// Always answers the same, whether or not the address has an account
export async function forgotPasswordAction(input: unknown): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/confirm?next=/reset-password`,
  });
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, message: authErrorMessage(error.code) };
  }
  if (error) console.error("forgotPassword failed", { code: error.code });
  return { ok: true };
}

// After the reset link: the user has a session and chooses a new password
export async function resetPasswordAction(input: unknown): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error.issues);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { ok: false, message: authErrorMessage("session_expired") };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("resetPassword failed", { code: error.code });
    return { ok: false, message: authErrorMessage(error.code) };
  }
  redirect("/dashboard");
}
