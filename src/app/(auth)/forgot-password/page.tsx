import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/brand/auth-card";
import { ForgotPasswordForm } from "@/features/auth/email-forms";
import { AUTH_MESSAGES } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "שכחתי סיסמה · Budgi" };

// Password reset, step 1: a link to the email (ADR-21)
type SearchParams = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ForgotPasswordPage({ searchParams }: SearchParams) {
  return (
    <AuthCard title="שכחתי סיסמה">
      <Suspense>
        <ExpiredLink searchParams={searchParams} />
      </Suspense>
      <p className="text-center type-small text-muted-foreground">נשלח אליך קישור לבחירת סיסמה חדשה.</p>
      <ForgotPasswordForm />
      <p className="text-center type-small text-muted-foreground">
        <AuthLink href="/login">חזרה להתחברות</AuthLink>
      </p>
    </AuthCard>
  );
}

async function ExpiredLink({ searchParams }: SearchParams) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="w-full rounded-lg bg-red-50 px-3 py-2 text-center type-small text-error">
      {AUTH_MESSAGES.sessionExpired}
    </p>
  );
}
