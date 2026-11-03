import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { DecorativeBackground } from "@/components/brand/decorative-background";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/server/auth/session";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";

export const metadata: Metadata = { title: "הגדרה ראשונית · Budgi" };

// DESIGN.md 1.2: shown once to a new user, without the Shell
export default function OnboardingPage() {
  return (
    <main className="relative isolate mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center gap-6 px-4 py-10">
      <DecorativeBackground />
      <div className="w-28">
        <Logo priority sizes="112px" />
      </div>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="type-h2">ברוכים הבאים ל-Budgi</h1>
        <p className="type-body text-muted-foreground">
          נגדיר את התקציב ויעד ההכנסות לחודש הנוכחי. אפשר לשנות הכול בהמשך.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <OnboardingGate />
      </Suspense>
    </main>
  );
}

async function OnboardingGate() {
  const user = await requireUser();
  if (user.onboarded) redirect("/dashboard");
  return <OnboardingForm />;
}
