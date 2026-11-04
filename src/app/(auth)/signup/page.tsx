import type { Metadata } from "next";
import { AuthCard, AuthLink } from "@/components/brand/auth-card";
import { SignUpForm } from "@/features/auth/email-forms";

export const metadata: Metadata = { title: "הרשמה · Budgi" };

// Sign-up with email and password (ADR-21); Google is on the login screen
export default function SignUpPage() {
  return (
    <AuthCard title="הרשמה עם אימייל">
      <SignUpForm />
      <p className="text-center type-small text-muted-foreground">
        כבר יש לך חשבון? <AuthLink href="/login">התחברות</AuthLink>
      </p>
    </AuthCard>
  );
}
