import type { Metadata } from "next";
import { AuthCard } from "@/components/brand/auth-card";
import { ResetPasswordForm } from "@/features/auth/email-forms";

export const metadata: Metadata = { title: "סיסמה חדשה · Budgi" };

// Password reset, step 2: opened from the email link, with a session (ADR-21)
export default function ResetPasswordPage() {
  return (
    <AuthCard title="בחירת סיסמה חדשה">
      <ResetPasswordForm />
    </AuthCard>
  );
}
